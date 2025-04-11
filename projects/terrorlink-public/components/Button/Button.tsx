import "./Button.css";

export default function Button({
	children,
	onClick,
}: {
	children: React.ReactNode;
	onClick?: () => void;
}) {
	return (
		<button className="Button" onClick={onClick} type="button">
			{children}
		</button>
	);
}
