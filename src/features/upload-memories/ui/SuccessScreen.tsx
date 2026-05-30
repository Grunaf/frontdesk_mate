"use client";
    
import Link from "next/link";
interface SuccessScreenProps {
  onReset: () => void;
}

export function SuccessScreen({ onReset }: SuccessScreenProps) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    return (
        <div className="border border-white/20 rounded-2xl p-8 bg-white/5 text-center flex flex-col items-center justify-center min-h-[250px]">
            <span className="text-4xl mb-3">💛</span>
            <p className="text-xl font-medium mb-1">Thank you for sharing!</p>
            <p className="text-sm text-white/60 mb-6">Your memories have been successfully uploaded.</p>
            <div className="flex flex-col sm:flex-row items-center gap-4">
                <Link 
                    href={siteUrl}
                    className="px-5 py-2 bg-white text-black font-medium text-sm rounded-xl hover:bg-white/90 transition-colors"
                >
                    Back to Home
                </Link>

                <button
                    type="button"
                    onClick={onReset}
                    className="text-sm text-white/50 hover:text-white underline transition-colors"
                >
                    Upload more
                </button>
            </div>
        </div>
    );
}