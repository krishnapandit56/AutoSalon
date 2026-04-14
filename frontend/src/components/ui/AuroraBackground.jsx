export default function AuroraBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      {/* Purple blob - top left */}
      <div
        className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full opacity-[0.07] animate-aurora-1"
        style={{ background: 'radial-gradient(circle, #8B5CF6, transparent 70%)' }}
      />
      {/* Cyan blob - top right */}
      <div
        className="absolute -top-20 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.06] animate-aurora-2"
        style={{ background: 'radial-gradient(circle, #06B6D4, transparent 70%)' }}
      />
      {/* Pink blob - bottom left */}
      <div
        className="absolute -bottom-40 -left-20 w-[550px] h-[550px] rounded-full opacity-[0.05] animate-aurora-2"
        style={{ background: 'radial-gradient(circle, #EC4899, transparent 70%)' }}
      />
      {/* Gold blob - bottom right */}
      <div
        className="absolute -bottom-32 -right-32 w-[450px] h-[450px] rounded-full opacity-[0.04] animate-aurora-1"
        style={{ background: 'radial-gradient(circle, #F59E0B, transparent 70%)' }}
      />
    </div>
  );
}
