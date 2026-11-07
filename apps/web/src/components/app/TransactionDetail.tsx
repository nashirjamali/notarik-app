"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { deleteTransaction, getTransaction, updateTransaction } from "@/lib/client";
import { formatIdr } from "@/lib/money";
import { fullDate, timeOf } from "@/lib/months";
import { categories, paymentMethods, type Category, type PaymentMethod, type Transaction } from "@/lib/types";
import { useClock } from "@/lib/useClock";
import { OptionSheet } from "./OptionSheet";
import { TopBar, TopBarButton } from "./TopBar";
import { TransactionForm } from "./TransactionForm";
import { CategoryIcon, Card, ErrorState, PageTitle, Skeleton, categoryMeta } from "./ui";

const svg = (name: string) => `/app-assets/svg/${name}.svg`;

/** A row of the info card. With `onClick` it is a button, like the "Change category" rows of the mobile app. */
function Info({ label, children, onClick, last }: { label: string; children: ReactNode; onClick?: () => void; last?: boolean }) {
  const body = (
    <>
      <span className="text-caption text-text-secondary">{label}</span>
      <span className="flex min-w-0 items-center justify-end gap-2 text-caption font-medium">{children}</span>
    </>
  );
  const style = `flex items-center justify-between gap-4 py-3 ${last ? "" : "border-b border-border-default"}`;
  return onClick ? (
    <button type="button" onClick={onClick} className={`${style} w-full text-left`}>
      {body}
    </button>
  ) : (
    <div className={style}>{body}</div>
  );
}

const itemsSummary = (items: Transaction["items"]) => {
  const shown = items.slice(0, 3).map((item) => item.name);
  const rest = items.length - shown.length;
  return rest > 0 ? `${shown.join(", ")} +${rest}` : shown.join(", ");
};

export function TransactionDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const client = useQueryClient();
  const clock = useClock();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [menu, setMenu] = useState(false);
  const [picker, setPicker] = useState<"category" | "payment" | null>(null);
  const [noteDraft, setNoteDraft] = useState<string | null>(null);
  const [itemsOpen, setItemsOpen] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);
  const viewer = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = viewer.current;
    if (!element) return;
    if (viewing && !element.open) element.showModal();
    if (!viewing && element.open) element.close();
  }, [viewing]);

  const query = useQuery({ queryKey: ["transaction", id], queryFn: () => getTransaction(id) });
  const save = useMutation({
    mutationFn: (values: Parameters<typeof updateTransaction>[1]) => updateTransaction(id, values),
    onSuccess: async () => {
      await client.invalidateQueries();
      setEditing(false);
    },
  });
  const remove = useMutation({
    mutationFn: () => deleteTransaction(id),
    onSuccess: async () => {
      router.replace("/app/transactions");
      client.removeQueries({ queryKey: ["transaction", id] });
      await client.invalidateQueries();
    },
  });

  const back = () => (window.history.length > 1 ? router.back() : router.replace("/app/transactions"));
  const backLink = (
    <Link href="/app/transactions" className="hidden text-caption font-medium text-brand-primary-strong hover:underline md:inline">
      ← Transactions
    </Link>
  );

  if (query.isPending || !clock) {
    return (
      <>
        <TopBar title="Details" onBack={back} />
        <Skeleton className="h-72 max-w-xl" />
      </>
    );
  }
  if (query.isError) {
    const gone = "status" in query.error && query.error.status === 404;
    return (
      <>
        <TopBar title="Details" onBack={back} />
        <PageTitle aside={backLink}>Expense</PageTitle>
        {gone ? <Card>This expense does not exist or was deleted.</Card> : <ErrorState message={query.error.message} onRetry={() => query.refetch()} />}
      </>
    );
  }

  const row = query.data;
  const fromReceipt = row.source === "photo" || row.source === "pdf";
  const receiptUrl = row.receipt_run_id ? `/api/proxy/receipts/${row.receipt_run_id}/image` : null;
  const saveNote = (value: string) => {
    const next = value.trim();
    setNoteDraft(null);
    if (next !== (row.note ?? "")) save.mutate({ note: next || null });
  };
  const accent = "text-brand-primary-strong";

  return (
    <>
      <TopBar
        title="Details"
        onBack={back}
        right={
          <>
            <TopBarButton label="More" onClick={() => setMenu((value) => !value)}>
              <Image src={svg("detail-more")} alt="" width={24} height={24} unoptimized />
            </TopBarButton>
            {menu && (
              <div className="absolute top-14 right-0 z-10 flex w-32 flex-col rounded-2xl border border-border-default bg-surface-default p-1 shadow-lg">
                <button type="button" aria-label="Edit expense" onClick={() => { setMenu(false); setEditing(true); }} className="rounded-xl px-3 py-2.5 text-left text-caption">
                  Edit
                </button>
                <button type="button" aria-label="Delete expense" onClick={() => { setMenu(false); setConfirming(true); }} className="rounded-xl px-3 py-2.5 text-left text-caption text-status-danger-text">
                  Delete
                </button>
              </div>
            )}
          </>
        }
      />
      <div className="hidden md:block">{backLink}</div>

      <div className="flex max-w-xl flex-col gap-4 md:mt-4">
        {editing ? (
          <Card>
            <h1 className="mb-4 text-center text-body-2 font-medium md:text-left md:font-heading md:text-headline-4 md:font-bold">Edit expense</h1>
            <TransactionForm
              initial={row}
              today={clock.today}
              submitLabel="Save changes"
              busy={save.isPending}
              error={save.error?.message ?? null}
              onSubmit={(values) => save.mutate(values)}
              onCancel={() => setEditing(false)}
            />
          </Card>
        ) : (
          <>
            <div className="flex flex-col items-center gap-2 text-center">
              <span className="flex size-20 items-center justify-center rounded-3xl bg-surface-subtle [&>span]:size-20 [&>span]:rounded-3xl [&_img]:size-[60px]">
                <CategoryIcon category={row.category} />
              </span>
              <h1 className="text-body-2 font-medium">{row.merchant}</h1>
              <p className="font-heading text-[40px] leading-[48px] font-bold tracking-[-1.6px]">{formatIdr(row.total_minor)}</p>
              {row.discount_minor > 0 && <p className="text-caption text-text-secondary">After a {formatIdr(row.discount_minor)} discount</p>}
              {fromReceipt && (
                <span className="flex items-center gap-1 rounded-full bg-brand-accent-subtle py-0.5 pr-2 pl-1.5 text-caption-small font-semibold text-brand-primary-strong">
                  <Image src={svg("review-mark")} alt="" width={12} height={10} unoptimized />
                  From receipt
                </span>
              )}
            </div>

            <div className="rounded-3xl bg-surface-subtle px-5">
              <Info label="Category" onClick={() => setPicker("category")}>
                <span className="flex items-center gap-2 rounded-full border border-border-default bg-surface-default px-3 py-1">
                  <span aria-hidden="true" className={`size-2 rounded-full ${categoryMeta[row.category].dot}`} />
                  {categoryMeta[row.category].label}
                  <Image src={svg("review-chevron-down")} alt="" width={16} height={16} unoptimized />
                </span>
              </Info>
              <Info label="Date">{fullDate(row.date, row.created_at, clock.today)}</Info>
              <Info label="Payment" onClick={() => setPicker("payment")}>
                <span className={row.payment_method ? "" : accent}>{row.payment_method ?? "Add payment"}</span>
              </Info>
              {noteDraft !== null ? (
                <div className="flex items-center justify-between gap-4 py-3">
                  <label htmlFor="note" className="text-caption text-text-secondary">
                    Note
                  </label>
                  <input
                    id="note"
                    autoFocus
                    value={noteDraft}
                    maxLength={500}
                    onChange={(event) => setNoteDraft(event.target.value)}
                    onBlur={() => saveNote(noteDraft)}
                    onKeyDown={(event) => event.key === "Enter" && saveNote(noteDraft)}
                    className="min-w-0 flex-1 bg-transparent text-right text-caption font-medium outline-none"
                  />
                </div>
              ) : (
                <Info label="Note" onClick={() => setNoteDraft(row.note ?? "")} last>
                  <span className={`truncate ${row.note ? "" : accent}`}>{row.note ?? "Add a note"}</span>
                </Info>
              )}
            </div>

            {(receiptUrl || row.items.length > 0) && (
              <div className="rounded-3xl bg-surface-subtle px-5">
                {receiptUrl && (
                  <button type="button" aria-label="View receipt" onClick={() => setViewing(true)} className={`flex w-full items-center gap-3 py-3 text-left ${row.items.length > 0 ? "border-b border-border-default" : ""}`}>
                    <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border-default bg-surface-default">
                      {!thumbFailed && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={receiptUrl} alt="" className="size-full object-cover" onError={() => setThumbFailed(true)} />
                      )}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-caption font-medium">View receipt</span>
                      <span className="text-caption-small text-text-secondary">
                        Scanned {row.date === clock.today ? "today" : `on ${row.date}`}, {timeOf(row.created_at)}
                      </span>
                    </span>
                    <Image src={svg("detail-chevron-right")} alt="" width={20} height={20} unoptimized />
                  </button>
                )}
                {row.items.length > 0 && (
                  <>
                    <button type="button" aria-expanded={itemsOpen} onClick={() => setItemsOpen((value) => !value)} className="flex w-full items-center gap-3 py-3 text-left">
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-surface-default text-body-2 font-medium">{row.items.length}</span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-caption font-medium">
                          {row.items.length} {row.items.length === 1 ? "item" : "items"}
                        </span>
                        <span className="truncate text-caption-small text-text-secondary">{itemsSummary(row.items)}</span>
                      </span>
                      <span className={itemsOpen ? "rotate-90" : ""}>
                        <Image src={svg("detail-chevron-right")} alt="" width={20} height={20} unoptimized />
                      </span>
                    </button>
                    {itemsOpen && (
                      <ul className="pb-3">
                        {row.items.map((item) => (
                          <li key={item.id} className="flex justify-between gap-4 py-1.5 text-caption">
                            <span className="min-w-0 truncate">
                              {item.name}
                              {item.qty && item.qty !== "1" ? ` ×${Number(item.qty)}` : ""}
                            </span>
                            <span className="shrink-0 font-medium">{formatIdr(item.line_total_minor)}</span>
                          </li>
                        ))}
                        {row.discount_minor > 0 && (
                          <li className="flex justify-between gap-4 py-1.5 text-caption font-medium text-status-success-text">
                            <span>Discount</span>
                            <span>−{formatIdr(row.discount_minor)}</span>
                          </li>
                        )}
                      </ul>
                    )}
                  </>
                )}
              </div>
            )}

            {(save.isError || remove.isError) && (
              <p role="alert" className="text-caption text-status-danger-text">
                {(save.error ?? remove.error)?.message}
              </p>
            )}

            <div className="flex flex-col items-stretch gap-2">
              <button type="button" aria-label="Edit" onClick={() => setEditing(true)} className="h-12 rounded-full bg-surface-subtle font-heading text-button-1 font-bold md:bg-brand-primary md:text-text-inverse md:hover:bg-brand-primary-strong">
                Edit
              </button>
              {confirming ? (
                <div className="flex justify-center gap-2">
                  <button type="button" onClick={() => setConfirming(false)} className="h-11 rounded-full px-5 font-heading text-button-2 font-bold text-text-secondary">
                    Keep
                  </button>
                  <button type="button" disabled={remove.isPending} onClick={() => remove.mutate()} className="h-11 rounded-full px-5 font-heading text-button-2 font-bold text-status-danger-text disabled:opacity-60">
                    Yes, delete
                  </button>
                </div>
              ) : (
                <button type="button" aria-label="Delete transaction" onClick={() => setConfirming(true)} className="h-11 rounded-full font-heading text-button-2 font-bold text-status-danger-text">
                  Delete transaction
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <OptionSheet<Category>
        open={picker === "category"}
        title="Category"
        options={categories.map((value) => ({ value, label: categoryMeta[value].label, dot: categoryMeta[value].dot }))}
        selected={row.category}
        onClose={() => setPicker(null)}
        onSelect={(value) => {
          setPicker(null);
          if (value !== row.category) save.mutate({ category: value });
        }}
      />
      <OptionSheet<PaymentMethod>
        open={picker === "payment"}
        title="Payment"
        options={paymentMethods.map((value) => ({ value, label: value }))}
        selected={row.payment_method}
        onClose={() => setPicker(null)}
        onSelect={(value) => {
          setPicker(null);
          if (value !== row.payment_method) save.mutate({ payment_method: value });
        }}
      />

      <dialog ref={viewer} aria-label="Receipt" onClose={() => setViewing(false)} onClick={() => setViewing(false)} className="m-auto max-h-[90dvh] max-w-[min(92vw,32rem)] rounded-3xl bg-transparent p-0 backdrop:bg-text-primary/70">
        {receiptUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={receiptUrl} alt="Receipt" className="max-h-[85dvh] w-auto rounded-3xl object-contain" />
        )}
        <button type="button" aria-label="Close receipt" onClick={() => setViewing(false)} className="mx-auto mt-3 block rounded-full bg-text-primary/80 px-5 py-2 font-heading text-button-2 font-bold text-text-inverse">
          Close
        </button>
      </dialog>
    </>
  );
}
