import { Link, useNavigate } from "react-router-dom";

export default function LandingPage() {
	const router = useNavigate();

	return (
		<>
			<nav className="bg-[#1e3c72cc]">
				<div className="container flex items-center justify-between w-full py-3">
					<div className="text-3xl font-bold text-white">
						<h2>NEXCHO</h2>
					</div>
					<div className="flex gap-3">
						<div
							className="
                bg-white px-4 py-2 rounded-md text-[#1e3c72] text-sm cursor-pointer font-medium hover:scale-[1.03] transition-all duration-200 ease-in-out
              "
						>
							<p
								onClick={() => {
									router("/auth");
								}}
							>
								Register
							</p>
						</div>
						<div
							className="
                bg-blue-900 px-4 py-2 rounded-md text-white text-sm cursor-pointer font-medium hover:scale-[1.03] transition-all duration-200 ease-in-out
              "
							onClick={() => {
								router("/auth");
							}}
						>
							<p>Login</p>
						</div>
					</div>
				</div>
			</nav>
			<div className="bg-black/95">
				<div className="container">
					<div className="grid md:grid-cols-2 h-full min-h-[80vh]">
						<div className="w-full h-full flex flex-col justify-center items-start">
							<div className="text-4xl font-bold max-w-[500px] leading-[48px] text-white text-center md:text-start">
								<span>
									<span style={{ color: "#FF9839" }}>Connect</span> with your
									loved Ones
								</span>
								Cover a distance by NEXCHO Video Call
							</div>
							<div className="w-full flex justify-center md:justify-start mt-5 items-center">
								<div className="bg-blue-900 text-base font-semibold px-4 py-2.5 rounded-md text-center text-white text-nowrap w-fit">
									<Link to={"/auth"}>Get Started</Link>
								</div>
							</div>
						</div>
						<div className="w-full h-full flex justify-center items-center">
							<img
								src="/mobile.png"
								alt="mobile video conferencing"
								className="w-[80%] h-[80%] object-contain"
							/>
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
