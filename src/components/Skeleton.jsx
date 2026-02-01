export default function Skeleton({ height }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl`}
      style={{ height }}
    ></div>
  );
}
