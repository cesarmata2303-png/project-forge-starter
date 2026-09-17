import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-forge-bg px-4">
      <div className="text-center space-y-4">
        <WifiOff size={48} className="text-forge-text-muted mx-auto" />
        <h1 className="text-xl font-bold text-forge-text">You&apos;re offline</h1>
        <p className="text-forge-text-muted text-sm max-w-xs mx-auto">
          Don&apos;t worry — your workout data is saved locally and will sync when you&apos;re back online.
        </p>
      </div>
    </div>
  );
}
