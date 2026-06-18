export default function HimWordmark({
  className = "",
  height = 26,
  title = "HIM",
}: {
  className?: string;
  height?: number;
  title?: string;
}) {
  return (
    <svg viewBox="168 196 608 134" height={height} role="img" aria-label={title} className={className} fill="currentColor">
      <path transform="matrix(1,0,0,-1,724.2081,199.24161)" d="M0 0-62.572-104.089-125.145 0H-174.231V-126.713H-145.93-145.911V-13.439L-77.732-126.713H-47.413L20.767-13.439V-126.713H20.785 49.087V0Z"/>
      <path transform="matrix(1,0,0,-1,0,540)" d="M241.942 214.045H270.262V261.284H241.942Z"/>
      <path transform="matrix(1,0,0,-1,0,540)" d="M472.092 214.045H500.41203V340.758H472.092Z"/>
      <path transform="matrix(1,0,0,-1,270.2626,199.2417)" d="M0 0H-28.32V-52.825H-99.329V-71.699H-99.078 113.195V-52.825H0Z"/>
      <path transform="matrix(1,0,0,-1,0,540)" d="M390.594 214.045H418.914V340.758H390.594Z"/>
    </svg>
  );
}
