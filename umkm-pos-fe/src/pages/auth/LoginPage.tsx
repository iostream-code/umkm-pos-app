import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ShoppingCart, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { getValidationErrors } from '@/lib/utils'
import toast from 'react-hot-toast'

const schema = z.object({
  email: z.string().min(1, 'Email wajib diisi').email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const [showPass, setShowPass] = useState(false)
  const { login, isLoading } = useAuthStore()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    try {
      await login(data.email, data.password)
      toast.success('Selamat datang kembali!')
      navigate('/dashboard')
    } catch (err: unknown) {
      const apiErrors = getValidationErrors(err)
      if (apiErrors.email) {
        setError('email', { message: apiErrors.email })
      } else {
        setError('email', { message: 'Email atau password salah.' })
      }
    }
  }

  return (
    <div className="w-full max-w-[400px] animate-fade-in">

      {/* Mobile logo */}
      <div className="flex items-center gap-2.5 mb-8 lg:hidden">
        <div className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center">
          <ShoppingCart size={18} className="text-white" />
        </div>
        <span className="font-display text-xl font-bold text-white">SmartPOS</span>
      </div>

      <h2 className="font-display text-3xl font-bold text-white mb-1">Masuk</h2>
      <p className="text-surface-400 mb-8">Masukkan kredensial akun Anda</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-surface-300 mb-1.5">
            Email
          </label>
          <input
            {...register('email')}
            type="email"
            placeholder="kasir@tokoku.com"
            autoComplete="email"
            className="input bg-surface-800 border-surface-700 text-white placeholder-surface-500
                       focus:border-primary-500 focus:ring-primary-500/20"
          />
          {errors.email && (
            <p className="mt-1.5 text-xs text-danger-400">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-surface-300 mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              {...register('password')}
              type={showPass ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="current-password"
              className="input bg-surface-800 border-surface-700 text-white placeholder-surface-500
                         focus:border-primary-500 focus:ring-primary-500/20 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-300"
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 text-xs text-danger-400">{errors.password.message}</p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full justify-center py-3 mt-2"
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Memproses...
            </>
          ) : (
            'Masuk'
          )}
        </button>
      </form>

      {/* Demo credentials */}
      <div className="mt-8 p-4 rounded-xl bg-surface-800/50 border border-surface-700">
        <p className="text-xs font-medium text-surface-400 mb-2">Akun demo:</p>
        <div className="space-y-1 text-xs text-surface-500 font-mono">
          <p>Owner &nbsp;&nbsp;→ owner@demo.com / password</p>
          <p>Manager → manager@demo.com / password</p>
          <p>Kasir &nbsp;&nbsp;→ kasir@demo.com / password</p>
        </div>
      </div>
    </div>
  )
}
