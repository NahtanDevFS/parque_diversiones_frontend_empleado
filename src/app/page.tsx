"use client"

import React, { useEffect } from 'react';
import './home.css';
import LayoutWithSidebar from '@/components/LayoutWithSidebar';
import { useRouter } from "next/navigation";

export default function Home() {

  const router = useRouter();

  useEffect(() => {
    const session = localStorage.getItem("employeeSession");
    if (!session) {
      router.push("/login");
    }
  }, [router]);

  return (
    <LayoutWithSidebar>
      <div className='home_page'>
        hello
      </div>
    </LayoutWithSidebar>
  );
}
