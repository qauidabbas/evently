"use client"

import Image from 'next/image'
import Link from 'next/link'
import React, { useState } from 'react'
import { Button } from './ui/button'
import { useAuth } from '@/context/AuthContext'
import { Building, Plus, Ticket, LogOut } from 'lucide-react'

const Header = () => {
  const { user, isLoading, logout } = useAuth();
  const [showUpgradeModel, setShowUpgradeModel]=useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 bg-background/80 backdrop-blur-xl z-20 border-b">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        
        <Link href="/" className="flex items-center">
          <Image
            src="/spott.png"
            alt="Spott logo"
            width={500}
            height={500}
            className="h-11 w-auto scale-125"
            priority
          />
        </Link>
        <div className="flex items-center gap-2">
          <Button variant={"ghost"} size="sm" onClick={()=>setShowUpgradeModel(true)}>Pricing</Button>
          <Button variant={"ghost"} size="sm" asChild className={"mr-2"}>
            <Link href="/explore">Explore</Link>
          </Button>
          
          {!isLoading && !user && (
            <Button size="sm" asChild>
              <Link href="/sign-in">Sign In</Link>
            </Button>
          )}

          {!isLoading && user && (
            <>
              <Button size="sm" asChild className={"flex gap-2 mr-4"}>
                <Link href="/create-event">
                  <Plus className='w-4 h-4'/>
                  <span className='hidden sm:inline'>Create Event</span>
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/my-tickets" className="flex items-center"><Ticket size={16} className="mr-2"/> Tickets</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/my-events" className="flex items-center"><Building size={16} className="mr-2"/> Events</Link>
              </Button>
              <Button variant="outline" size="sm" onClick={logout} className="flex items-center">
                <LogOut size={16} className="mr-2"/> Logout
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Header
