export default function FertilizerStockLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1720px] w-full mx-auto space-y-5 animate-pulse">
      <div className="h-32 rounded-2xl glass-panel border border-border-light" />
      <div className="h-24 rounded-2xl glass-panel border border-border-light" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="h-24 rounded-2xl glass-panel border border-border-light" />
        <div className="h-24 rounded-2xl glass-panel border border-border-light" />
        <div className="h-24 rounded-2xl glass-panel border border-border-light" />
      </div>
      <div className="h-96 rounded-2xl glass-panel border border-border-light" />
    </div>
  );
}

