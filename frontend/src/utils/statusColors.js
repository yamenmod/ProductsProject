export const STATUS_COLORS = {
  success: "#79b64a",
  cancelled: "#f07c2e",
  completed: "#6FBEB2",
};

export const getStatusColor = (bucket) =>
  STATUS_COLORS[bucket] || STATUS_COLORS.cancelled;

export const getStatusTone = (bucket, selected = false) => {
  const color = getStatusColor(bucket);

  return {
    background: selected ? color : `${color}1f`,
    color: selected ? "#fff" : color,
    border: `1px solid ${color}33`,
  };
};
