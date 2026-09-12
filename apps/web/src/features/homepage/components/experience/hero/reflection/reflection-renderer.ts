import { observeReflectionPointer } from "@/features/homepage/components/experience/hero/reflection/reflection-pointer";
import { createReflectionTexture } from "@/features/homepage/components/experience/hero/reflection/reflection-texture";
import {
  REFLECTION_FRAGMENT_SHADER,
  REFLECTION_VERTEX_SHADER,
} from "@/features/homepage/components/experience/hero/reflection/shaders";

function compileShader(
  context: WebGLRenderingContext,
  type: number,
  source: string
) {
  const shader = context.createShader(type);
  if (!shader) {
    return null;
  }
  context.shaderSource(shader, source);
  context.compileShader(shader);
  if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
    context.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(context: WebGLRenderingContext) {
  const vertex = compileShader(
    context,
    context.VERTEX_SHADER,
    REFLECTION_VERTEX_SHADER
  );
  const fragment = compileShader(
    context,
    context.FRAGMENT_SHADER,
    REFLECTION_FRAGMENT_SHADER
  );
  const program = context.createProgram();
  if (!(vertex && fragment && program)) {
    context.deleteShader(vertex);
    context.deleteShader(fragment);
    context.deleteProgram(program);
    return null;
  }
  context.attachShader(program, vertex);
  context.attachShader(program, fragment);
  context.linkProgram(program);
  context.deleteShader(vertex);
  context.deleteShader(fragment);
  if (!context.getProgramParameter(program, context.LINK_STATUS)) {
    context.deleteProgram(program);
    return null;
  }
  return program;
}

export function createReflectionRenderer({
  canvas,
  image,
}: {
  canvas: HTMLCanvasElement;
  image: HTMLImageElement;
}) {
  const context = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    powerPreference: "low-power",
  });
  if (!context) {
    return null;
  }
  const resources = createReflectionResources(context, image);
  if (!resources) {
    return null;
  }
  const { program } = resources;
  const resolution = context.getUniformLocation(program, "resolution");
  const time = context.getUniformLocation(program, "time");
  const previewAspect = context.getUniformLocation(program, "previewAspect");
  const pointerUniform = context.getUniformLocation(program, "ripples[0]");
  const pointer = observeReflectionPointer(canvas);
  return {
    dispose() {
      pointer.dispose();
      resources.dispose();
    },
    render(elapsedSeconds: number) {
      context.uniform4fv(pointerUniform, pointer.read(elapsedSeconds));
      context.uniform1f(time, elapsedSeconds);
      context.drawArrays(context.TRIANGLES, 0, 3);
    },
    resize() {
      const pixelRatio = Math.min(window.devicePixelRatio + 0.5, 2);
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * pixelRatio));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * pixelRatio));
      context.uniform1f(previewAspect, image.width / image.height);
      context.viewport(0, 0, canvas.width, canvas.height);
      context.uniform2f(resolution, canvas.width, canvas.height);
    },
    updateImage(nextImage: HTMLImageElement) {
      resources.texture.update(nextImage);
    },
  };
}

function createReflectionResources(
  context: WebGLRenderingContext,
  image: HTMLImageElement
) {
  const program = createProgram(context);
  const buffer = context.createBuffer();
  const texture = createReflectionTexture(context, image);
  function dispose() {
    context.deleteProgram(program);
    context.deleteBuffer(buffer);
    texture?.dispose();
  }
  if (!(program && buffer && texture)) {
    dispose();
    return null;
  }
  bindReflectionGeometry(context, program, buffer);
  return { dispose, program, texture };
}

function bindReflectionGeometry(
  context: WebGLRenderingContext,
  program: WebGLProgram,
  buffer: WebGLBuffer
) {
  const activateProgram = context.useProgram.bind(context);
  activateProgram(program);
  context.bindBuffer(context.ARRAY_BUFFER, buffer);
  context.bufferData(
    context.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    context.STATIC_DRAW
  );
  const position = context.getAttribLocation(program, "position");
  context.enableVertexAttribArray(position);
  context.vertexAttribPointer(position, 2, context.FLOAT, false, 0, 0);
}
