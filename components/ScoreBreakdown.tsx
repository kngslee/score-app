type Props = {
  breakdown: Record<string, number>;
};

export default function ScoreBreakdown({ breakdown }: Props) {
  return (
    <div className="space-y-2">
      {Object.entries(breakdown).map(([key, value]) => (
        <div key={key} className="flex justify-between text-sm">
          <span className="text-gray-600">{key}</span>
          <span className="font-medium">{value}</span>
        </div>
      ))}
    </div>
  );
}