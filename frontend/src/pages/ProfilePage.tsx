import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { getUserProfile } from '@/api/user';
import { AnimatedPage } from '@/components/layout';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Avatar,
  AvatarFallback,
  Badge,
  Progress,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui';
import { LoadingSpinner } from '@/components/common';
import { staggerContainer, staggerItem } from '@/lib/animations';
import type { UserProfile } from '@/types';

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await getUserProfile();
      setProfile(data);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return 'U';
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/auth');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setLoggingOut(false);
      setShowLogoutDialog(false);
    }
  };

  const domainLabels: Record<string, string> = {
    grammar: t('profile.grammar') || 'Grammar',
    vocabulary: t('profile.vocabulary') || 'Vocabulary',
    pragmatics: t('profile.pragmatics') || 'Pragmatics',
    pronunciation: t('profile.pronunciation') || 'Pronunciation',
  };

  if (loading) {
    return (
      <AnimatedPage className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('nav.back') || 'Back'}
          </Button>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="space-y-6"
        >
          {/* Profile Header Card */}
          <motion.div variants={staggerItem}>
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-20 w-20 border-4 border-accent/20 mb-4">
                    <AvatarFallback className="bg-accent text-white text-2xl">
                      {getInitials(user?.name, user?.email)}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="text-xl font-semibold">{user?.name || 'User'}</h2>
                  <p className="text-muted-foreground">{user?.email}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Learning Progress Card */}
          {profile?.assessed && (
            <motion.div variants={staggerItem}>
              <Card>
                <CardHeader>
                  <CardTitle>{t('profile.learningProgress') || 'Learning Progress'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* SKLC Level */}
                  {profile.sklcLevel && (
                    <div className="text-center p-4 bg-accent/10 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">
                        {t('profile.yourLevel') || 'Your Level'}
                      </p>
                      <p className="text-2xl font-bold text-accent">{profile.sklcLevel}</p>
                      {profile.sklcDescription && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {profile.sklcDescription}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Domain Bands */}
                  {profile.domainBands && (
                    <div className="space-y-4">
                      <h4 className="font-medium">
                        {t('profile.domainScores') || 'Domain Scores'}
                      </h4>
                      {Object.entries(profile.domainBands).map(([domain, score]) => (
                        <div key={domain} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>{domainLabels[domain] || domain}</span>
                            <span className="text-muted-foreground">{score}/10</span>
                          </div>
                          <Progress value={score * 10} className="h-2" />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Goals Card */}
          {profile?.goals && profile.goals.length > 0 && (
            <motion.div variants={staggerItem}>
              <Card>
                <CardHeader>
                  <CardTitle>{t('profile.goals') || 'Your Goals'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {profile.goals.map((goal) => (
                      <Badge key={goal} variant="secondary">
                        {goal}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Account Card */}
          <motion.div variants={staggerItem}>
            <Card>
              <CardHeader>
                <CardTitle>{t('profile.account') || 'Account'}</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setShowLogoutDialog(true)}
                >
                  <LogOut className="h-4 w-4" />
                  {t('nav.logout') || 'Logout'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>

      {/* Logout Confirmation Dialog */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{t('logout.title') || 'Logout'}</DialogTitle>
            <DialogDescription>
              {t('logout.confirm') || 'Are you sure you want to log out?'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowLogoutDialog(false)}
              disabled={loggingOut}
            >
              {t('logout.cancel') || 'Cancel'}
            </Button>
            <Button
              variant="destructive"
              onClick={handleLogout}
              loading={loggingOut}
            >
              {t('logout.confirm_button') || 'Log Out'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AnimatedPage>
  );
}
