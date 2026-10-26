import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@ctrl-ui/react/ui/item";
import { Heading, Text } from "@ctrl-ui/react/ui/typography";
import type { HubActivity } from "../hub-link/use-hub-stream";

export function AppsSection({ activity }: { activity: HubActivity }) {
  const { apps, focus } = activity;
  return (
    <section aria-labelledby="live-apps" className="flex flex-col gap-2">
      <Heading id="live-apps" level={2} size="heading-4">
        Apps
      </Heading>
      {apps.length === 0 ? (
        <Text size="caption" tone="muted">
          Open one of your apps with the Reflet devtools: it joins on its own.
        </Text>
      ) : (
        <ItemGroup>
          {apps.map((app) => {
            const page = focus?.appId === app.id ? focus.page : null;
            return (
              <Item
                data-focused={focus?.appId === app.id}
                key={app.id}
                role="listitem"
                title={app.root}
                variant="outline"
              >
                <ItemMedia>
                  <span
                    aria-hidden="true"
                    className="size-2 rounded-full bg-muted-foreground/40 in-data-[focused=true]:bg-success"
                  />
                </ItemMedia>
                <ItemContent className="min-w-0">
                  <ItemTitle>{app.label}</ItemTitle>
                  <ItemDescription className="truncate">
                    {page ? `${page.title || page.path} · ` : ""}
                    {app.origin}
                  </ItemDescription>
                </ItemContent>
              </Item>
            );
          })}
        </ItemGroup>
      )}
    </section>
  );
}
