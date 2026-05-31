export const STATUS_COLORS = {
  success: "#79b64a",
  unsuccessful: "#f07c2e",
  pending: "#ffbf24",
};

export const getStatusColor = (bucket) =>
  STATUS_COLORS[bucket] || STATUS_COLORS.pending;

export const getStatusTone = (bucket, selected = false) => {
  const color = getStatusColor(bucket);

  return {
    background: selected ? color : `${color}1f`,
    color: selected ? "#fff" : color,
    border: `1px solid ${color}33`,
  };
};
