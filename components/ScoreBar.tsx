type Props = {
  score: number;
};

export default function ScoreBar({ score }: Props) {
  return (
    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-red-400 via-yellow-400 to-green-500 transition-all duration-500"
        style={{ width: `${score}%` }}
      />
    </div>
  );
}