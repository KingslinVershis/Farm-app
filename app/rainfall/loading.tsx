export default function RainfallLoading() {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      {/* Background Photography Layer */}
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat transition-all duration-700 ease-in-out scale-105"
        style={{
          backgroundImage: `url('/images/rain.jpg')`,
        }}
      />
      <div className="fixed inset-0 pointer-events-none z-0 gpu-accelerate" />

      <div className="relative z-10 p-4 sm:p-6 lg:p-8 max-w-[1720px] w-full mx-auto space-y-5 animate-pulse">
        <div className="h-32 rounded-2xl glass-panel border border-border-light" />
        <div className="h-24 rounded-2xl glass-panel border border-border-light" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-28 rounded-2xl glass-panel border border-border-light" />
          <div className="h-28 rounded-2xl glass-panel border border-border-light" />
          <div className="h-28 rounded-2xl glass-panel border border-border-light" />
          <div className="h-28 rounded-2xl glass-panel border border-border-light" />
        </div>
        <div className="h-96 rounded-2xl glass-panel border border-border-light" />
      </div>
    </div>
  );
}

