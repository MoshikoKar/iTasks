'use client';

import { useState } from 'react';
import { Settings, Mail, Activity } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Button } from './button';
import { useRouter } from 'next/navigation';

const Modal = dynamic(() => import('./modal').then(mod => ({ default: mod.Modal })), {
  ssr: false,
});
const SMTPConfigForm = dynamic(() => import('./smtp-config-form').then(mod => ({ default: mod.SMTPConfigForm })), {
  ssr: false,
});
const SLAConfigForm = dynamic(() => import('./sla-config-form').then(mod => ({ default: mod.SLAConfigForm })), {
  ssr: false,
});
const LDAPConfigForm = dynamic(() => import('./ldap-config-form').then(mod => ({ default: mod.LDAPConfigForm })), {
  ssr: false,
});

export function AdminSettingsPage() {
  const router = useRouter();
  const [isSMTPModalOpen, setIsSMTPModalOpen] = useState(false);
  const [isSLAModalOpen, setIsSLAModalOpen] = useState(false);
  const [isLDAPModalOpen, setIsLDAPModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">System Settings</h1>

      {/* System Configuration */}
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Settings size={20} className="text-blue-600" />
          System Configuration
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-gradient-to-r from-white to-slate-50 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2">
                <Mail size={20} className="text-blue-600" />
              </div>
              <div>
                <div className="font-medium text-slate-900">SMTP Server</div>
                <div className="text-sm text-slate-600">Local LAN, Port 25</div>
              </div>
            </div>
            <Button 
              variant="ghost" 
              className="text-blue-600"
              onClick={() => setIsSMTPModalOpen(true)}
            >
              Configure
            </Button>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-gradient-to-r from-white to-slate-50 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2">
                <Settings size={20} className="text-blue-600" />
              </div>
              <div>
                <div className="font-medium text-slate-900">SLA Defaults</div>
                <div className="text-sm text-slate-600">Configure default SLA deadlines</div>
              </div>
            </div>
            <Button 
              variant="ghost" 
              className="text-blue-600"
              onClick={() => setIsSLAModalOpen(true)}
            >
              Configure
            </Button>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-gradient-to-r from-white to-slate-50 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2">
                <Activity size={20} className="text-blue-600" />
              </div>
              <div>
                <div className="font-medium text-slate-900">LDAP / LDAPS Authentication</div>
                <div className="text-sm text-slate-600">Enterprise authentication integration</div>
              </div>
            </div>
            <Button 
              variant="ghost" 
              className="text-blue-600"
              onClick={() => setIsLDAPModalOpen(true)}
            >
              Configure
            </Button>
          </div>
        </div>
      </section>

      {/* SMTP Configuration Modal */}
      <Modal
        isOpen={isSMTPModalOpen}
        onClose={() => setIsSMTPModalOpen(false)}
        title="Configure SMTP Server"
        size="md"
      >
        <SMTPConfigForm
          onSuccess={() => {
            setIsSMTPModalOpen(false);
            router.refresh();
          }}
          onCancel={() => setIsSMTPModalOpen(false)}
        />
      </Modal>

      {/* SLA Defaults Configuration Modal */}
      <Modal
        isOpen={isSLAModalOpen}
        onClose={() => setIsSLAModalOpen(false)}
        title="Configure SLA Defaults"
        size="md"
      >
        <SLAConfigForm
          onSuccess={() => {
            setIsSLAModalOpen(false);
            router.refresh();
          }}
          onCancel={() => setIsSLAModalOpen(false)}
        />
      </Modal>

      {/* LDAP Configuration Modal */}
      <Modal
        isOpen={isLDAPModalOpen}
        onClose={() => setIsLDAPModalOpen(false)}
        title="Configure LDAP Authentication"
        size="lg"
      >
        <LDAPConfigForm
          onSuccess={() => {
            setIsLDAPModalOpen(false);
            router.refresh();
          }}
          onCancel={() => setIsLDAPModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
