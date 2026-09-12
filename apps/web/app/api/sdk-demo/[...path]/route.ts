export function POST() {
  return Response.json(
    { error: "This is a preview. No feedback was sent." },
    { status: 400 }
  );
}
