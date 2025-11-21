export default function GuestLayout({ children }) {
    return (
        <div className="auth-hero">
            <div className="auth-card w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-slate-900/40 shadow-2xl backdrop-blur-2xl">
                <div className="flex flex-col md:flex-row">
                    <div className="hidden md:block md:w-1/2">
                        <div className="auth-image-panel h-full w-full">
                            <div className="auth-image-slide" />
                            <div className="auth-image-slide" />
                            <div className="auth-image-slide" />
                            <div className="auth-image-slide" />
                            <div className="auth-image-slide" />
                        </div>
                    </div>
                    <div className="hidden md:block w-px bg-slate-100/20" />
                    <div className="w-full md:w-1/2 px-6 py-6 sm:px-10 sm:py-10">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
