import Link from "next/link";
import { getUserTask } from "../model/action";
import languagesObject from "../../data/language";
import RightSidebar from "@/components/RightSidebar";
import TaskView from "@/components/TaskView";

export default async function Home({ searchParams }: { searchParams: any }) {
  const language = languagesObject;
  const { session } = searchParams;
  let userTasks;
  let userDetail;
  let errMsg;
  let userHistory;
  if (session && session !== "") {
    const result = await getUserTask(session);
    if (result?.error) {
      errMsg = result?.error;
    } else {
      userTasks = result?.userTasks;
      userDetail = result?.userData;
      userHistory = result?.userHistory;
    }
  }

  const routes = [{ name: "Dashboard", path: "/dashboard" }];

  return (
    <div className="flex flex-col justify-center items-center overflow-y-auto">
      {session === undefined || session === "" ? (
        <>
          <div className="text-xl font-semibold mt-10 p-5 text-center">
            No user found ,URL must end with ?session=EMAIL
          </div>
          <div className="flex flex-col gap-6 sm:flex-row">
            {routes.map((route) => (
              <Link
                key={route.name}
                href={route.path}
                type="button"
                className="btn btn-accent"
              >
                {route.name}
              </Link>
            ))}
          </div>
        </>
      ) : errMsg ? (
        <div className="mt-10 p-5 text-xl font-semibold text-center">
          {errMsg}
        </div>
      ) : (
        <TaskView
          tasks={userTasks}
          userDetail={userDetail}
          language={language}
          userHistory={userHistory}
        />
      )}
    <RightSidebar>
        <iframe
          className="w-full h-full"
          src="https://docs.google.com/spreadsheets/d/e/2PACX-1vT5gDbwko0iKrR46GjJgsmMgGQXc6EiC9xBugl8BvV66pPz-czBeyO1DfVsti0jg-EJqTZ7dSUCu_qC/pubhtml?gid=991898896&amp;single=true&amp;widget=true&amp;headers=false"
        ></iframe>
      </RightSidebar>
    </div>
  );
}
