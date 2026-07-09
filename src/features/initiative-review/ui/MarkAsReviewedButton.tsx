interface MarkAsReviewedButtonProps {
  id: string;
  action: (formData: FormData) => Promise<void>;
}

export function MarkAsReviewedButton({ id, action }: MarkAsReviewedButtonProps) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Mark as reviewed
      </button>
    </form>
  );
}
