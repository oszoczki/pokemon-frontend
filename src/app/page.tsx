import AuthForm from "./components/AuthForm";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-8 text-black">Bejelentkezés / Regisztráció</h1>
        <AuthForm />
      </div>
    </div>
  );
}
