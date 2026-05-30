"use client";
import { useFormStatus } from "react-dom";

export default function SubmitBtn() {
    const {pending} = useFormStatus();
    
    return (
        <button
        type="submit"
        disabled={pending}
        className="w-full rounded-2xl bg-white text-black py-3 font-medium hover:opacity-90 transition disabled:opacity-50"
        >
            {pending ? "Uploading..." : "Upload"}
        </button>
    )
}