import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo_EstoqueAgil.png';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      console.log('Tentando fazer login com:', { email });
      
      if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Configuração do Supabase não encontrada:', { 
          url: supabaseUrl, 
          hasKey: !!supabaseAnonKey 
        });
        setError('Erro de configuração do sistema. Contate o administrador.');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });

      console.log('Resposta do login:', { data, error });

      if (error) {
        console.error('Erro no login:', error);
        if (error.message.includes('Invalid login credentials')) {
          setError('Email ou senha incorretos');
        } else {
          setError(error.message);
        }
      } else if (data.session && data.user) {
        // Agora que temos o token, vamos buscar o perfil do nosso banco de dados
        try {
          const apiResponse = await fetch(`${import.meta.env.VITE_API_URL}/usuarios/email/${data.user.email}`, {
            headers: {
              'Authorization': `Bearer ${data.session.access_token}`
            }
          });

          if (!apiResponse.ok) {
            throw new Error('Usuário autenticado, mas não encontrado em nosso sistema.');
          }

          const localUser = await apiResponse.json();

          localStorage.setItem('user', JSON.stringify(localUser)); // Salva o usuário do nosso DB
          localStorage.setItem('session', JSON.stringify(data.session)); // Salva a sessão do Supabase
          
          console.log('Login bem sucedido, dados locais salvos, redirecionando...');
          navigate('/dashboard');
        } catch (apiError: any) {
          setError(apiError.message || 'Falha ao buscar dados do usuário.');
        }
      } else {
        setError('Resposta inesperada do serviço de autenticação.');
      }
    } catch (err: any) {
      console.error('Erro inesperado:', err);
      setError(err.message || 'Erro inesperado ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: '#fff',
        borderRadius: '16px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        <div style={{ 
          background: '#fff', 
          padding: '40px 32px',
          textAlign: 'center'
        }}>
          <img 
            src={logo} 
            alt="EstoqueAgil Logo" 
            style={{ 
              width: 'auto',
              height: '80px',
              marginBottom: '32px'
            }} 
          />
          
          <form onSubmit={handleLogin} style={{ textAlign: 'left' }}>
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#4A5568',
                fontSize: '14px',
                fontWeight: 500
              }}>
                E-mail
              </label>
              <input
                type="email"
                placeholder="Seu e-mail corporativo"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="login-input"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '2px solid #E2E8F0',
                  fontSize: '16px',
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: error ? '16px' : '24px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#4A5568',
                fontSize: '14px',
                fontWeight: 500
              }}>
                Senha
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Sua senha"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="login-input"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    paddingRight: '48px',
                    borderRadius: '8px',
                    border: '2px solid #E2E8F0',
                    fontSize: '16px',
                    transition: 'all 0.2s',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#718096',
                    cursor: 'pointer',
                    padding: '0',
                    fontSize: '14px'
                  }}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ 
                padding: '12px 16px',
                background: '#FFF5F5',
                color: '#C53030',
                borderRadius: '8px',
                fontSize: '14px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>⚠️</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="login-button"
              style={{
                width: '100%',
                padding: '12px',
                background: '#2B6CB0',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '16px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {loading ? (
                <>
                  <span style={{ 
                    display: 'inline-block',
                    width: '20px',
                    height: '20px',
                    border: '3px solid #ffffff33',
                    borderTop: '3px solid #fff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></span>
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </button>

            <p style={{ 
              marginTop: '24px', 
              fontSize: '14px', 
              color: '#718096',
              textAlign: 'center'
            }}>
              Problemas para acessar? Entre em contato com o administrador do sistema.
            </p>
          </form>
        </div>
      </div>

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          .login-input:focus {
            border-color: #2B6CB0 !important;
            box-shadow: 0 0 0 3px rgba(43, 108, 176, 0.1) !important;
          }

          .login-button:hover:not(:disabled) {
            background: #2C5282 !important;
          }
        `}
      </style>
    </div>
  );
};

export default Login; 