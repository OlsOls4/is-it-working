/** Placeholder shown for the server render / hydration pass, before localStorage has been read. */
export default function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="skel" style={{ width: "40%", height: 12 }} />
      <div className="skel" style={{ width: "85%", height: 34, marginTop: 12 }} />
      {Array.from({ length: lines }, (_, i) => <div key={i} className="skel" style={{ height: 88, marginTop: 14 }} />)}
    </div>
  );
}
