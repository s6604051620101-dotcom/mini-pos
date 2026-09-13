"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function HistoryPage() {
  // รายการประวัติการขายทั้งหมด
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // โหลดข้อมูลประวัติการขายเมื่อเปิดหน้า
  useEffect(() => {
    fetchSales();
  }, []);

  async function fetchSales() {
    setLoading(true);
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('sold_at', { ascending: false });

    if (error) {
      setErrorMsg('โหลดประวัติการขายไม่สำเร็จ: ' + error.message);
    } else {
      setSales(data);
      setErrorMsg('');
    }
    setLoading(false);
  }

  // คำนวณยอดขายรวมทั้งหมดจากทุกรายการ
  const totalAll = sales.reduce((sum, s) => sum + Number(s.total_price), 0);

  // แปลง timestamp เป็นรูปแบบวันเวลาที่อ่านง่าย
  function formatDate(dateString) {
    const d = new Date(dateString);
    return d.toLocaleString('th-TH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  return (
    <div>
      <h1>ประวัติการขาย</h1>

      {errorMsg && (
        <div style={{ color: '#dc2626', marginBottom: 12 }}>{errorMsg}</div>
      )}

      {/* ยอดขายรวมทั้งหมด */}
      <div className="card">
        <div style={{ fontSize: 16, color: '#6b7280' }}>ยอดขายรวมทั้งหมด</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: '#16a34a' }}>
          {totalAll.toFixed(2)} บาท
        </div>
      </div>

      {/* ตารางประวัติการขาย */}
      {loading ? (
        <p>กำลังโหลด...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>วันเวลาที่ขาย</th>
              <th>ชื่อสินค้า</th>
              <th>จำนวน</th>
              <th>ยอดรวม</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s.id}>
                <td>{formatDate(s.sold_at)}</td>
                <td>{s.product_name}</td>
                <td>{s.quantity}</td>
                <td>{Number(s.total_price).toFixed(2)}</td>
              </tr>
            ))}
            {sales.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: '#9ca3af' }}>
                  ยังไม่มีประวัติการขาย
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
