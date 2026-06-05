import styles from './styles.module.css';

type Variant = 'invalid' | 'frozen';

const COPY: Record<Variant, { title: string; body: string }> = {
  invalid: {
    title: "This link isn't active",
    body: 'The evaluation may have been deleted, or the link is invalid. Ask the person who sent it to share a new one.',
  },
  frozen: {
    title: 'Voting has paused',
    body: 'The creator paused voting on this evaluation. Check back later — if they resume sharing, the same link will start working again.',
  },
};

export function ErrorState({ variant = 'invalid' }: { variant?: Variant }) {
  const { title, body } = COPY[variant];
  return (
    <main className={styles.errorWrap}>
      <div className={styles.errorCard}>
        <h1 className={styles.errorTitle}>{title}</h1>
        <p className={styles.errorBody}>{body}</p>
      </div>
    </main>
  );
}
