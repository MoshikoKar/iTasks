'use client';

import { useState } from 'react';
import { Settings, Mail, Activity, Sliders } from 'lucide-react';
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
const VariableConfigForm = dynamic(() => import('./variable-config-form').then(mod => ({ default: mod.VariableConfigForm })), {
  ssr: false,
});

export function AdminSettingsPage() {
  const router = useRouter();
  const [isSMTPModalOpen, setIsSMTPModalOpen] = useState(false);
  const [isSLAModalOpen, setIsSLAModalOpen] = useState(false);
  const [isLDAPModalOpen, setIsLDAPModalOpen] = useState(false);
  const [isVariableModalOpen, setIsVariableModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">System Settings</h1>

      {/* System Configuration */}
      <section className="card-base p-6">
        <h2 className="mb-6 text-lg font-semibold text-foreground flex items-center gap-2">
          <Settings size={20} className="text-primary" />
          System Configuration
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Mail size={20} className="text-primary" />
              </div>
              <div>
                <div className="font-medium text-foreground">SMTP Server</div>
                <div className="text-sm text-muted-foreground">Local LAN, Port 25</div>
              </div>
            </div>
            <Button 
              variant="ghost" 
              className="text-primary"
              onClick={() => setIsSMTPModalOpen(true)}
            >
              Configure
            </Button>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Settings size={20} className="text-primary" />
              </div>
              <div>
                <div className="font-medium text-foreground">SLA Defaults</div>
                <div className="text-sm text-muted-foreground">Configure default SLA deadlines</div>
              </div>
            </div>
            <Button 
              variant="ghost" 
              className="text-primary"
              onClick={() => setIsSLAModalOpen(true)}
            >
              Configure
            </Button>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Activity size={20} className="text-primary" />
              </div>
              <div>
                <div className="font-medium text-foreground">LDAP / LDAPS Authentication</div>
                <div className="text-sm text-muted-foreground">Enterprise authentication integration</div>
              </div>
            </div>
            <Button 
              variant="ghost" 
              className="text-primary"
              onClick={() => setIsLDAPModalOpen(true)}
            >
              Configure
            </Button>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Sliders size={20} className="text-primary" />
              </div>
              <div>
                <div className="font-medium text-foreground">Variable Configuration</div>
                <div className="text-sm text-muted-foreground">Application-wide variables (support email, etc.)</div>
              </div>
            </div>
            <Button 
              variant="ghost" 
              className="text-primary"
              onClick={() => setIsVariableModalOpen(true)}
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

      {/* Variable Configuration Modal */}
      <Modal
        isOpen={isVariableModalOpen}
        onClose={() => setIsVariableModalOpen(false)}
        title="Configure Variables"
        size="md"
      >
        <VariableConfigForm
          onSuccess={() => {
            setIsVariableModalOpen(false);
            router.refresh();
          }}
          onCancel={() => setIsVariableModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
