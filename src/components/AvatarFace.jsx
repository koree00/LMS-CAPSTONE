// The student's animal, with the item they are wearing on top
export default function AvatarFace({ animal, item, size = 40 }) {
  return (
    <span
      aria-hidden="true"
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size, fontSize: size * 0.62 }}
    >
      {animal}
      {item && (
        <span className="absolute left-1/2 -translate-x-1/2" style={{ top: -size * 0.3, fontSize: size * 0.5 }}>
          {item}
        </span>
      )}
    </span>
  );
}
