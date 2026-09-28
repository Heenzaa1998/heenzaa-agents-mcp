import { HomeView } from "@/components/home-view";
import { getDictionary } from "@/server/i18n";

export default async function Home() {
  const { dict } = await getDictionary();

  return <HomeView dict={dict} />;
}
