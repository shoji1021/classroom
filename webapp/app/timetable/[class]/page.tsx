import TimetableClient from './TimetableClient';

export async function generateStaticParams() {
  return [
    { class: '1F' },
    { class: '2F' },
    { class: '3F' },
    { class: '1M' },
    { class: '2M' },
    { class: '3M' },
  ];
}

export default function TimetablePage({ params }: { params: { class: string } }) {
  return <TimetableClient className={params.class} />;
}

