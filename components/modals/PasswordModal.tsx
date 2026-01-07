
import React, { useState } from 'react';

interface PasswordModalProps {
  onClose: () => void;
  onVerify: (password: string) => boolean;
}

const PasswordModal: React.FC<PasswordModalProps> = ({ onClose, onVerify }) => {
  const [password, setPassword] = useState('');

  const handleSubmit = () => {
    if (!onVerify(password)) {
      alert('密码错误');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[999] flex justify-center items-center p-5">
      <div className="bg-white w-full max-w-xs rounded-3xl p-8 shadow-2xl">
        <h3 className="text-center font-black text-xl mb-6">管理员验证</h3>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="请输入管理员密码"
          className="w-full p-4 bg-[#F5F5F5] border-none rounded-xl text-lg text-center mb-6 outline-none"
        />
        <button
          onClick={handleSubmit}
          className="w-full bg-[#DA291C] text-white py-4 rounded-full font-black text-lg shadow-lg"
        >
          确认进入
        </button>
        <button
          onClick={onClose}
          className="w-full mt-4 text-gray-500 font-bold"
        >
          取消
        </button>
      </div>
    </div>
  );
};

export default PasswordModal;
