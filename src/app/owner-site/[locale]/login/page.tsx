export default function OwnerLoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="text-sm text-muted-foreground">Authentication — Module 2.</p>
      </div>

      <form className="space-y-4 rounded-xl border bg-background p-6 opacity-80" aria-disabled="true">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Email</span>
          <input
            type="email"
            disabled
            placeholder="you@hostel.com"
            className="w-full rounded-md border bg-muted/40 px-3 py-2 text-sm"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Password</span>
          <input
            type="password"
            disabled
            className="w-full rounded-md border bg-muted/40 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="button"
          disabled
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground opacity-50"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
