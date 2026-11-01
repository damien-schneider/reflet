use std::{
    net::{TcpStream, ToSocketAddrs},
    process::ExitCode,
    rc::Rc,
    thread,
    time::Duration,
};

#[cfg(target_os = "macos")]
use tao::platform::macos::{ActivationPolicy, EventLoopExtMacOS, WindowBuilderExtMacOS};
use tao::{
    dpi::{LogicalPosition, LogicalSize},
    event::{Event, WindowEvent},
    event_loop::{ControlFlow, EventLoop, EventLoopBuilder, EventLoopProxy},
    window::WindowBuilder,
};
use wry::WebViewBuilder;

const TITLE: &str = "Reflet Live";
const DEFAULT_WIDTH: f64 = 248.0;
const DEFAULT_HEIGHT: f64 = 300.0;
const RIGHT_MARGIN: f64 = 24.0;
const TOP_MARGIN: f64 = 40.0;
const HUB_CHECK_INTERVAL: Duration = Duration::from_secs(1);
const HUB_CONNECT_TIMEOUT: Duration = Duration::from_millis(500);
const HUB_MISSES_BEFORE_EXIT: u32 = 3;

enum ShellEvent {
    Close,
}

struct Options {
    size: LogicalSize<f64>,
    url: String,
}

fn dimension(value: Option<String>, fallback: f64) -> f64 {
    value
        .and_then(|text| text.parse::<f64>().ok())
        .filter(|number| number.is_finite() && *number > 0.0)
        .unwrap_or(fallback)
}

fn parse_options() -> Option<Options> {
    let mut args = std::env::args().skip(1);
    let url = args.next().filter(|value| !value.is_empty())?;
    let width = dimension(args.next(), DEFAULT_WIDTH);
    let height = dimension(args.next(), DEFAULT_HEIGHT);
    Some(Options {
        size: LogicalSize::new(width, height),
        url,
    })
}

fn hub_address(url: &str) -> Option<String> {
    let (scheme, rest) = url.split_once("://")?;
    let authority = rest.split(['/', '?', '#']).next()?;
    if authority.is_empty() {
        return None;
    }
    let has_port = authority.rsplit_once(':').is_some_and(|(_, port)| {
        !port.is_empty() && port.bytes().all(|byte| byte.is_ascii_digit())
    });
    if has_port {
        return Some(authority.to_owned());
    }
    let port = if scheme.eq_ignore_ascii_case("https") {
        443
    } else {
        80
    };
    Some(format!("{authority}:{port}"))
}

fn hub_reachable(address: &str) -> bool {
    address.to_socket_addrs().is_ok_and(|mut candidates| {
        candidates
            .any(|candidate| TcpStream::connect_timeout(&candidate, HUB_CONNECT_TIMEOUT).is_ok())
    })
}

fn close_when_hub_stops(address: String, proxy: EventLoopProxy<ShellEvent>) {
    thread::spawn(move || {
        let mut seen = false;
        let mut misses = 0;
        while misses < HUB_MISSES_BEFORE_EXIT {
            thread::sleep(HUB_CHECK_INTERVAL);
            if hub_reachable(&address) {
                seen = true;
                misses = 0;
            } else if seen {
                misses += 1;
            }
        }
        let _ = proxy.send_event(ShellEvent::Close);
    });
}

fn top_right(
    event_loop: &EventLoop<ShellEvent>,
    size: LogicalSize<f64>,
) -> Option<LogicalPosition<f64>> {
    let monitor = event_loop.primary_monitor()?;
    let scale = monitor.scale_factor();
    let origin: LogicalPosition<f64> = monitor.position().to_logical(scale);
    let extent: LogicalSize<f64> = monitor.size().to_logical(scale);
    Some(LogicalPosition::new(
        origin.x + extent.width - size.width - RIGHT_MARGIN,
        origin.y + TOP_MARGIN,
    ))
}

fn main() -> ExitCode {
    let Some(options) = parse_options() else {
        eprintln!("usage: reflet-live-shell <url> [width] [height]");
        return ExitCode::from(2);
    };

    #[cfg_attr(not(target_os = "macos"), allow(unused_mut))]
    let mut event_loop = EventLoopBuilder::<ShellEvent>::with_user_event().build();
    #[cfg(target_os = "macos")]
    event_loop.set_activation_policy(ActivationPolicy::Accessory);

    let mut builder = WindowBuilder::new()
        .with_title(TITLE)
        .with_inner_size(options.size)
        .with_decorations(false)
        .with_transparent(true)
        .with_always_on_top(true)
        .with_visible_on_all_workspaces(true)
        .with_resizable(false);
    if let Some(position) = top_right(&event_loop, options.size) {
        builder = builder.with_position(position);
    }
    #[cfg(target_os = "macos")]
    let builder = builder.with_has_shadow(false);

    let window = match builder.build(&event_loop) {
        Ok(window) => Rc::new(window),
        Err(error) => {
            eprintln!("reflet-live-shell: could not create the window: {error}");
            return ExitCode::FAILURE;
        }
    };

    let drag_target = Rc::clone(&window);
    let close_proxy = event_loop.create_proxy();
    let webview = WebViewBuilder::new()
        .with_url(&options.url)
        .with_transparent(true)
        .with_accept_first_mouse(true)
        .with_ipc_handler(move |request| match request.body().as_str() {
            "drag" => {
                let _ = drag_target.drag_window();
            }
            "close" => {
                let _ = close_proxy.send_event(ShellEvent::Close);
            }
            _ => {}
        })
        .build(&window);
    let webview = match webview {
        Ok(webview) => webview,
        Err(error) => {
            eprintln!("reflet-live-shell: could not create the web view: {error}");
            return ExitCode::FAILURE;
        }
    };

    if let Some(address) = hub_address(&options.url) {
        close_when_hub_stops(address, event_loop.create_proxy());
    }

    event_loop.run(move |event, _, control_flow| {
        *control_flow = ControlFlow::Wait;
        let _ = (&window, &webview);
        if let Event::UserEvent(ShellEvent::Close)
        | Event::WindowEvent {
            event: WindowEvent::CloseRequested,
            ..
        } = event
        {
            *control_flow = ControlFlow::Exit;
        }
    })
}
