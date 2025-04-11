import "./Stripe.css";

export default function Stripe({
	active,
}: {
	active: boolean;
}) {
	return <div className="Stripe" data-active={active} />;
}
