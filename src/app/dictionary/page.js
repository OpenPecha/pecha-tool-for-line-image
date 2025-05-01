"use client";
import React, { useEffect, useState } from "react";
import AbbreviationList from "@/components/abbreviation/AbbreviationList";
import { useSearchParams } from "next/navigation";
import { getUserByEmail } from "@/model/user";

export default function DictionaryPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("session");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (email) {
      setLoading(true);
      getUserByEmail(email)
        .then(setUser)
        .catch(() => setUser(null))
        .finally(() => setLoading(false));
    }
  }, [email]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        {loading ? (
          <div className="text-center">Loading...</div>
        ) : (
          <AbbreviationList
            isOpen={true}
            isSidebar={false}
            userRole={user?.role}
            onClose={() => {}}
          />
        )}
      </div>
    </div>
  );
}
