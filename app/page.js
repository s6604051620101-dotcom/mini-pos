"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function HomePage() {
  // รายการสินค้าทั้งหมด
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // ฟอร์มเพิ่มสินค้าใหม่
  const [form, setForm] = useState({
    sku: '',
    name: '',
    price: '',
    stock: '',
    unit: '',
  });

  // สถานะแก้ไขแบบ inline (เก็บ id ของแถวที่กำลังแก้ไข + ค่าที่แก้)
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  // โหลดรายการสินค้าเมื่อเปิดหน้า
  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setErrorMsg('โหลดข้อมูลสินค้าไม่สำเร็จ: ' + error.message);
    } else {
      setProducts(data);
      setErrorMsg('');
    }
    setLoading(false);
  }

  // จัดการ input ของฟอร์มเพิ่มสินค้า
  function handleFormChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  // เพิ่มสินค้าใหม่ลงตาราง products
  async function handleAddProduct(e) {
    e.preventDefault();
    if (!form.sku || !form.name) {
      setErrorMsg('กรุณากรอก SKU และชื่อสินค้า');
      return;
    }

    const { error } = await supabase.from('products').insert([
      {
        sku: form.sku,
        name: form.name,
        price: parseFloat(form.price) || 0,
        stock: parseInt(form.stock, 10) || 0,
        unit: form.unit,
      },
    ]);

    if (error) {
      setErrorMsg('เพิ่มสินค้าไม่สำเร็จ: ' + error.message);
      return;
    }

    // เคลียร์ฟอร์มและโหลดข้อมูลใหม่
    setForm({ sku: '', name: '', price: '', stock: '', unit: '' });
    fetchProducts();
  }

  // ลบสินค้า
  async function handleDelete(id) {
    const confirmDelete = window.confirm('ยืนยันการลบสินค้านี้?');
    if (!confirmDelete) return;

    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      setErrorMsg('ลบสินค้าไม่สำเร็จ: ' + error.message);
      return;
    }
    fetchProducts();
  }

  // เริ่มแก้ไขแถว: เก็บค่าปัจจุบันไว้ใน editForm
  function startEdit(product) {
    setEditingId(product.id);
    setEditForm({
      sku: product.sku,
      name: product.name,
      price: product.price,
      stock: product.stock,
      unit: product.unit,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({});
  }

  function handleEditChange(e) {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  }

  // บันทึกการแก้ไขกลับไปที่ Supabase
  async function saveEdit(id) {
    const { error } = await supabase
      .from('products')
      .update({
        sku: editForm.sku,
        name: editForm.name,
        price: parseFloat(editForm.price) || 0,
        stock: parseInt(editForm.stock, 10) || 0,
        unit: editForm.unit,
      })
      .eq('id', id);

    if (error) {
      setErrorMsg('บันทึกการแก้ไขไม่สำเร็จ: ' + error.message);
      return;
    }

    setEditingId(null);
    setEditForm({});
    fetchProducts();
  }

  return (
    <div>
      <h1>รายการสินค้า</h1>

      {errorMsg && (
        <div style={{ color: '#dc2626', marginBottom: 12 }}>{errorMsg}</div>
      )}

      {/* ฟอร์มเพิ่มสินค้าใหม่ */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>เพิ่มสินค้าใหม่</h2>
        <form
          onSubmit={handleAddProduct}
          style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}
        >
          <input
            name="sku"
            placeholder="SKU"
            value={form.sku}
            onChange={handleFormChange}
            style={{ width: 100 }}
          />
          <input
            name="name"
            placeholder="ชื่อสินค้า"
            value={form.name}
            onChange={handleFormChange}
            style={{ width: 160 }}
          />
          <input
            name="price"
            type="number"
            step="0.01"
            placeholder="ราคา"
            value={form.price}
            onChange={handleFormChange}
            style={{ width: 100 }}
          />
          <input
            name="stock"
            type="number"
            placeholder="คงเหลือ"
            value={form.stock}
            onChange={handleFormChange}
            style={{ width: 100 }}
          />
          <input
            name="unit"
            placeholder="หน่วย"
            value={form.unit}
            onChange={handleFormChange}
            style={{ width: 80 }}
          />
          <button type="submit">เพิ่มสินค้า</button>
        </form>
      </div>

      {/* ตารางแสดงรายการสินค้า */}
      {loading ? (
        <p>กำลังโหลด...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>ชื่อสินค้า</th>
              <th>ราคา</th>
              <th>คงเหลือ</th>
              <th>หน่วย</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                {editingId === p.id ? (
                  // โหมดแก้ไข inline
                  <>
                    <td>
                      <input
                        name="sku"
                        value={editForm.sku}
                        onChange={handleEditChange}
                        style={{ width: 80 }}
                      />
                    </td>
                    <td>
                      <input
                        name="name"
                        value={editForm.name}
                        onChange={handleEditChange}
                        style={{ width: 140 }}
                      />
                    </td>
                    <td>
                      <input
                        name="price"
                        type="number"
                        step="0.01"
                        value={editForm.price}
                        onChange={handleEditChange}
                        style={{ width: 80 }}
                      />
                    </td>
                    <td>
                      <input
                        name="stock"
                        type="number"
                        value={editForm.stock}
                        onChange={handleEditChange}
                        style={{ width: 70 }}
                      />
                    </td>
                    <td>
                      <input
                        name="unit"
                        value={editForm.unit}
                        onChange={handleEditChange}
                        style={{ width: 60 }}
                      />
                    </td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => saveEdit(p.id)}>บันทึก</button>
                      <button
                        onClick={cancelEdit}
                        style={{ backgroundColor: '#9ca3af' }}
                      >
                        ยกเลิก
                      </button>
                    </td>
                  </>
                ) : (
                  // โหมดแสดงผลปกติ
                  <>
                    <td>{p.sku}</td>
                    <td>{p.name}</td>
                    <td>{Number(p.price).toFixed(2)}</td>
                    <td>{p.stock}</td>
                    <td>{p.unit}</td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => startEdit(p)}>แก้ไข</button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        style={{ backgroundColor: '#dc2626' }}
                      >
                        ลบ
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#9ca3af' }}>
                  ยังไม่มีสินค้า
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
