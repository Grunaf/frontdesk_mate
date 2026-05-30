"use client";

interface InstagramInputProps {
    value: string;
    onChange: (value: string) => void;
}

export function InstagramInput({value, onChange}: InstagramInputProps) { 
    return (
        <div>
            <label className="block mb-2 text-sm text-white/70">
                Instagram Account (optional)
            </label>
            <input
                type="text"
                placeholder="@username"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2
                text-white placeholder:text-white/50 focus:outline-none focus:border-white/30"
                />
        </div>
    );
}