'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useToast } from '@/components/ui/toast'
import { CalendarIcon, UserIcon, ShieldIcon, SettingsIcon, ActivityIcon, AlertTriangleIcon, EyeIcon, EyeOffIcon, UploadIcon, LogOut } from 'lucide-react'

// Validation schemas
const editProfileSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(100, 'Full name too long'),
  bio: z.string().max(500, 'Bio must be 500 characters or less').optional(),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type EditProfileFormData = z.infer<typeof editProfileSchema>
type ChangePasswordFormData = z.infer<typeof changePasswordSchema>

// Password strength checker
const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
  let score = 0
  if (password.length >= 8) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[a-z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1

  const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong']
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500']
  
  return {
    score,
    label: labels[Math.min(score, 4)] || 'Very Weak',
    color: colors[Math.min(score, 4)] || 'bg-red-500'
  }
}

export default function ProfilePage() {
  const { user, profile, loading, updateProfile, updatePassword, signOut } = useAuth()
  const router = useRouter()
  const { successToast, errorToast } = useToast()
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: 'Very Weak', color: 'bg-red-500' })

  // Forms
  const editProfileForm = useForm<EditProfileFormData>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      full_name: profile?.full_name || '',
      bio: '', // Bio field would need to be added to the database schema
    },
  })

  const changePasswordForm = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin')
    }
  }, [user, loading, router])

  // Loading state
  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  // Form handlers
  const handleEditProfile = async (data: EditProfileFormData) => {
    const { error } = await updateProfile({
      full_name: data.full_name,
      // bio: data.bio, // Would be added when bio field exists in database
    })

    if (error) {
      errorToast.general('Failed to update profile', error.message)
    } else {
      successToast.general('Profile updated successfully!')
    }
  }

  const handleChangePassword = async (data: ChangePasswordFormData) => {
    // First verify current password by attempting to sign in
    try {
      const { error } = await updatePassword(data.newPassword)
      
      if (error) {
        errorToast.general('Failed to update password', error.message)
      } else {
        successToast.general('Password updated successfully!')
        changePasswordForm.reset()
      }
    } catch (error) {
      errorToast.general('Failed to update password', 'An unexpected error occurred')
    }
  }

  const handleDeleteAccount = async () => {
    // This would require additional backend implementation
    errorToast.general('Account deletion not implemented yet', 'This feature will be available in a future update')
    setIsDeleteDialogOpen(false)
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      // Force a page refresh to ensure clean state
      window.location.href = '/'
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const handlePasswordChange = (password: string) => {
    setPasswordStrength(getPasswordStrength(password))
  }

  // Helper functions
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Include the main header */}
      <div className="border-b">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Link href="/" className="mr-6 flex items-center space-x-1">
              <img src="/saasonic-logo.png" alt="SaaSonic" className="h-8 w-8" />
              <span className="hidden font-bold sm:inline-block">SaaSonic</span>
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <nav className="flex items-center space-x-4 text-sm font-medium">
              <Link href="/youtube-analytics" className="text-foreground/60 hover:text-foreground/80">
                YouTube Analytics
              </Link>
              <Link href="/airtable" className="text-foreground/60 hover:text-foreground/80">
                Airtable
              </Link>
            </nav>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                {profile?.full_name || user.email}
              </span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="grid gap-6">
          {/* Profile Overview Section */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || user.email || ''} />
                <AvatarFallback className="text-lg">
                  {profile?.full_name ? getInitials(profile.full_name) : <UserIcon className="h-8 w-8" />}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  <UserIcon className="h-5 w-5" />
                  Profile Overview
                </CardTitle>
                <CardDescription>Your account information and status</CardDescription>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{profile?.full_name || 'No name set'}</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${profile?.email_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {profile?.email_verified ? 'Verified' : 'Unverified'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <CalendarIcon className="h-4 w-4" />
                    Member since {profile?.created_at ? formatDate(profile.created_at) : 'Unknown'}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="shrink-0">
                <UploadIcon className="h-4 w-4" />
                Change Photo
              </Button>
            </CardHeader>
          </Card>

          {/* Edit Profile Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Update your personal details and profile information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...editProfileForm}>
                <form onSubmit={editProfileForm.handleSubmit(handleEditProfile)} className="space-y-4">
                  <FormField
                    control={editProfileForm.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter your full name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <div className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
                      <span className="text-sm">{user.email}</span>
                      <Button variant="ghost" size="sm" disabled>
                        Change Email
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Email changes will be available in a future update
                    </p>
                  </div>

                  <FormField
                    control={editProfileForm.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bio</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Tell us a little about yourself..." 
                            className="min-h-[100px]"
                          />
                        </FormControl>
                        <FormDescription>
                          Brief description for your profile. Maximum 500 characters.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={editProfileForm.formState.isSubmitting}
                      className="min-w-[120px]"
                    >
                      {editProfileForm.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Security Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldIcon className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Manage your password and account security
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...changePasswordForm}>
                <form onSubmit={changePasswordForm.handleSubmit(handleChangePassword)} className="space-y-4">
                  <FormField
                    control={changePasswordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              {...field} 
                              type={showCurrentPassword ? "text" : "password"}
                              placeholder="Enter your current password"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            >
                              {showCurrentPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={changePasswordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              {...field} 
                              type={showNewPassword ? "text" : "password"}
                              placeholder="Enter your new password"
                              onChange={(e) => {
                                field.onChange(e)
                                handlePasswordChange(e.target.value)
                              }}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                            >
                              {showNewPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        {field.value && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                                  style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground min-w-[60px]">
                                {passwordStrength.label}
                              </span>
                            </div>
                          </div>
                        )}
                        <FormDescription>
                          Password must be at least 8 characters with uppercase, lowercase, and numbers.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={changePasswordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              {...field} 
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Confirm your new password"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                              {showConfirmPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={changePasswordForm.formState.isSubmitting}
                      className="min-w-[140px]"
                    >
                      {changePasswordForm.formState.isSubmitting ? 'Updating...' : 'Update Password'}
                    </Button>
                  </div>
                </form>
              </Form>

              <div className="mt-6 pt-6 border-t">
                <div className="text-sm text-muted-foreground">
                  Last password change: Coming soon
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Settings Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                Account Settings
              </CardTitle>
              <CardDescription>
                Manage your account preferences and data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email Preferences */}
              <div className="space-y-4">
                <h4 className="font-medium">Email Preferences</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Product Updates</p>
                      <p className="text-xs text-muted-foreground">Get notified about new features and updates</p>
                    </div>
                    <Button variant="outline" size="sm" disabled>
                      Enable
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Security Alerts</p>
                      <p className="text-xs text-muted-foreground">Important security notifications</p>
                    </div>
                    <Button variant="outline" size="sm" disabled>
                      Enable
                    </Button>
                  </div>
                </div>
              </div>

              {/* Data Export */}
              <div className="space-y-4">
                <h4 className="font-medium">Data Management</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Export Data</p>
                    <p className="text-xs text-muted-foreground">Download a copy of your account data</p>
                  </div>
                  <Button variant="outline" size="sm" disabled>
                    Export
                  </Button>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="space-y-4 pt-6 border-t border-destructive/20">
                <h4 className="font-medium text-destructive flex items-center gap-2">
                  <AlertTriangleIcon className="h-4 w-4" />
                  Danger Zone
                </h4>
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-destructive">Delete Account</p>
                      <p className="text-xs text-muted-foreground">
                        Permanently delete your account and all associated data
                      </p>
                    </div>
                    <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          Delete Account
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Are you absolutely sure?</DialogTitle>
                          <DialogDescription>
                            This action cannot be undone. This will permanently delete your account
                            and remove all your data from our servers.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button variant="destructive" onClick={handleDeleteAccount}>
                            Yes, delete my account
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ActivityIcon className="h-5 w-5" />
                Account Activity
              </CardTitle>
              <CardDescription>
                Recent account activity and session information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Account Created</p>
                    <p className="text-sm text-muted-foreground">
                      {profile?.created_at ? formatDate(profile.created_at) : 'Unknown'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Last Updated</p>
                    <p className="text-sm text-muted-foreground">
                      {profile?.updated_at ? formatDate(profile.updated_at) : 'Unknown'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Last Login</p>
                    <p className="text-sm text-muted-foreground">
                      Current session
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Active Sessions</p>
                    <p className="text-sm text-muted-foreground">
                      1 session (this device)
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Recent Activity</p>
                      <p className="text-xs text-muted-foreground">Coming soon - detailed activity logs</p>
                    </div>
                    <Button variant="outline" size="sm" disabled>
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}