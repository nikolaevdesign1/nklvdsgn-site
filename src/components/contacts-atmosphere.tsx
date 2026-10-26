export function ContactsAtmosphere() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[1] overflow-hidden">
      <div className="contacts-drift-a absolute -left-[12%] top-[6%] h-[58vh] w-[54vw] rounded-full bg-[radial-gradient(circle,rgba(96,150,210,0.34),transparent_68%)] blur-3xl" />
      <div className="contacts-drift-b absolute -right-[8%] bottom-[4%] h-[62vh] w-[46vw] rounded-full bg-[radial-gradient(circle,rgba(36,72,120,0.42),transparent_70%)] blur-3xl" />
      <div className="contacts-drift-c absolute left-[28%] top-[38%] h-[36vh] w-[38vw] rounded-full bg-[radial-gradient(circle,rgba(170,198,230,0.14),transparent_66%)] blur-2xl" />
    </div>
  );
}
