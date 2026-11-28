'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import {Send} from 'lucide-react';
import type {ChatMessage} from '@/lib/store/core';

const POLL_MS = 2500;
const MAX = 1000;
const errors: Record<string, string> = {
  chat_unavailable: 'This chat is closed (the table was cancelled, someone was blocked, or an account was suspended).',
  slow_down: 'You are sending messages too quickly. Wait a few seconds.',
  invalid_message: 'Messages must be between 1 and 1000 characters.',
  unauthorized: 'Your session ended. Sign in again.'
};

function time(value: string) {
  return new Intl.DateTimeFormat('en-IN', {timeStyle: 'short', dateStyle: 'short', timeZone: 'Asia/Kolkata'}).format(new Date(value));
}

export function ChatRoom({peerId, peerName, initial}: {peerId: string; peerName: string; initial: ChatMessage[]}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [closed, setClosed] = useState(false);
  const lastSeq = useRef(initial.at(-1)?.seq ?? 0);
  const list = useRef<HTMLOListElement>(null);
  const stickToBottom = useRef(true);

  const merge = useCallback((incoming: ChatMessage[]) => {
    if (!incoming.length) return;
    setMessages(current => {
      const seen = new Set(current.map(m => m.id));
      const next = [...current, ...incoming.filter(m => !seen.has(m.id))].sort((a, b) => a.seq - b.seq);
      lastSeq.current = next.at(-1)?.seq ?? lastSeq.current;
      return next;
    });
  }, []);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat/${peerId}?after=${lastSeq.current}`, {cache: 'no-store'});
      if (res.status === 401 || res.status === 403) { const body = await res.json().catch(() => ({})); setError(errors[body.error] ?? errors.chat_unavailable); {setClosed(true);setMessages([]);window.location.reload();} return; }
      if (!res.ok) return;
      const body = await res.json() as {messages: ChatMessage[]};
      merge(body.messages);
    } catch { /* offline for a moment; next poll retries */ }
  }, [peerId, merge]);

  useEffect(() => {
    if (closed) return;
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void poll(); }, POLL_MS);
    const onFocus = () => void poll();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(timer); window.removeEventListener('focus', onFocus); };
  }, [poll, closed]);

  useEffect(() => {
    const el = list.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function send(event?: React.FormEvent) {
    event?.preventDefault();
    const body = text.trim();
    if (!body || sending || closed) return;
    setSending(true); setError('');
    try {
      const res = await fetch(`/api/chat/${peerId}`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({body})});
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(errors[data.error] ?? 'Message not sent. Try again.'); if (res.status === 403 || res.status === 401) {setClosed(true);setMessages([]);window.location.reload();} return; }
      stickToBottom.current = true;
      merge([data.message]);
      setText('');
    } catch { setError('Network problem — message not sent. Try again.'); }
    finally { setSending(false); }
  }

  return <section className="chat-room dash-card">
    <ol ref={list} className="chat-list" aria-live="polite" aria-label={`Conversation with ${peerName}`}
      onScroll={e => { const el = e.currentTarget; stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60; }}>
      {!messages.length && <li className="chat-empty">Say hello to {peerName}! Plan where to meet, or pick a conversation card to start.</li>}
      {messages.map(m => <li key={m.id} className={m.mine ? 'chat-bubble mine' : 'chat-bubble'}>
        <p>{m.body}</p><time dateTime={m.created_at}>{m.mine ? 'You' : peerName} · {time(m.created_at)}</time>
      </li>)}
    </ol>
    {error && <p role="alert" className="error-box">{error}</p>}
    <form className="chat-form" onSubmit={send}>
      <label className="sr-only" htmlFor="chat-input">Message</label>
      <textarea id="chat-input" value={text} maxLength={MAX} rows={2} disabled={closed} placeholder={closed ? 'Chat closed' : `Message ${peerName}…`}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }}/>
      <button className="primary" disabled={sending || closed || !text.trim()} aria-label="Send message"><Send size={17}/> {sending ? 'Sending…' : 'Send'}</button>
    </form>
    <p className="chat-hint">Enter to send · Shift+Enter for a new line · Keep it kind — you can block or report from the table page.</p>
  </section>;
}
