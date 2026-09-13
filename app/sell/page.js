"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function SellPage() {
  // รายการสินค้าทั้งหมด (สำหรับ dropdown)
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // ตะกร้าสินค้าที่กำลังจะขาย: [{ productId, name, price, unit, stock, quantity }]
  const [cart, setCart] = useState([]);

  // ค่าที่กำลังเลือก/กรอกเพื่อเพิ่มลงตะกร้า
  const [selectedProductId, setSelectedProductId] = useState('');
  const [addQty, setAddQty] = useState('');

  // สถานะข้อความแจ้งเตือน
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      setErrorMsg('โหลดข้อมูลสินค้าไม่สำเร็จ: ' + error.message);
    } else {
      setProducts(data);
    }
    setLoading(false);
  }

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // ยอดรวมทั้งตะกร้า
  const grandTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // เพิ่มสินค้าลงตะกร้า (ถ้ามีสินค้านี้อยู่แล้วให้บวกจำนวนเพิ่ม)
  function handleAddToCart(e) {
    e.preventDefault();
    setErrorMsg('');

    const qty = parseInt(addQty, 10) || 0;
    if (!selectedProduct) {
      setErrorMsg('กรุณาเลือกสินค้า');
      return;
    }
    if (qty <= 0) {
      setErrorMsg('กรุณากรอกจำนวนที่ต้องการ');
      return;
    }

    // เช็คจำนวนที่จะขายรวม (ของเดิมในตะกร้า + ที่เพิ่มใหม่) ต้องไม่เกิน stock
    const existing = cart.find((item) => item.productId === selectedProduct.id);
    const alreadyInCart = existing ? existing.quantity : 0;

    if (alreadyInCart + qty > selectedProduct.stock) {
      setErrorMsg(
        `สินค้าคงเหลือไม่พอ (คงเหลือ ${selectedProduct.stock} ${selectedProduct.unit}, ในตะกร้ามีแล้ว ${alreadyInCart})`
      );
      return;
    }

    if (existing) {
      setCart(
        cart.map((item) =>
          item.productId === selectedProduct.id
            ? { ...item, quantity: item.quantity + qty }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          productId: selectedProduct.id,
          name: selectedProduct.name,
          price: selectedProduct.price,
          unit: selectedProduct.unit,
          stock: selectedProduct.stock,
          quantity: qty,
        },
      ]);
    }

    setSelectedProductId('');
    setAddQty('');
  }

  // แก้จำนวนในตะกร้าโดยตรง
  function handleCartQtyChange(productId, newQtyRaw) {
    const newQty = parseInt(newQtyRaw, 10) || 0;
    const product = products.find((p) => p.id === productId);

    if (product && newQty > product.stock) {
      setErrorMsg(`สินค้าคงเหลือไม่พอ (คงเหลือ ${product.stock} ${product.unit})`);
      return;
    }
    setErrorMsg('');

    setCart(
      cart.map((item) =>
        item.productId === productId ? { ...item, quantity: newQty } : item
      )
    );
  }

  function handleRemoveFromCart(productId) {
    setCart(cart.filter((item) => item.productId !== productId));
  }

  function resetAll() {
    setCart([]);
    setSelectedProductId('');
    setAddQty('');
  }

  // กดปุ่ม "ยืนยันการขาย" — บันทึกทุกรายการในตะกร้า
  async function handleCheckout() {
    setErrorMsg('');
    setSuccessMsg('');

    if (cart.length === 0) {
      setErrorMsg('ยังไม่มีสินค้าในตะกร้า');
      return;
    }
    // กรองรายการที่จำนวนเป็น 0 ทิ้งก่อนเช็ค
    const validCart = cart.filter((item) => item.quantity > 0);
    if (validCart.length === 0) {
      setErrorMsg('กรุณาระบุจำนวนสินค้าให้ถูกต้อง');
      return;
    }

    setSubmitting(true);
    const soldAt = new Date().toISOString();

    // บันทึกทีละรายการ: insert ลง sales และลด stock ใน products
    for (const item of validCart) {
      const { error: saleError } = await supabase.from('sales').insert([
        {
          product_id: item.productId,
          product_name: item.name,
          quantity: item.quantity,
          total_price: item.price * item.quantity,
          sold_at: soldAt,
        },
      ]);

      if (saleError) {
        setErrorMsg(`บันทึกการขาย "${item.name}" ไม่สำเร็จ: ${saleError.message}`);
        setSubmitting(false);
        fetchProducts();
        return;
      }

      const currentProduct = products.find((p) => p.id === item.productId);
      const newStock = (currentProduct ? currentProduct.stock : item.stock) - item.quantity;

      const { error: updateError } = await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', item.productId);

      if (updateError) {
        setErrorMsg(`อัปเดตสต๊อก "${item.name}" ไม่สำเร็จ: ${updateError.message}`);
        setSubmitting(false);
        fetchProducts();
        return;
      }
    }

    setSuccessMsg(`ขายสำเร็จ ${validCart.length} รายการ ยอดรวม ${grandTotal.toFixed(2)} บาท`);
    resetAll();
    fetchProducts();
    setSubmitting(false);
  }

  return (
    <div>
      <h1>ขายสินค้า</h1>

      {/* สรุปยอดรวมตัวใหญ่ไว้บนสุด ให้ทั้งผู้ขายและลูกค้าเห็นชัด */}
      <div
        className="card"
        style={{
          textAlign: 'center',
          padding: '24px 16px',
          backgroundColor: '#111827',
          color: '#fff',
        }}
      >
        <div style={{ fontSize: 16, opacity: 0.8, marginBottom: 4 }}>
          ยอดที่ต้องชำระ ({totalItemsCount} ชิ้น)
        </div>
        <div style={{ fontSize: 48, fontWeight: 800, lineHeight: 1.2 }}>
          {grandTotal.toFixed(2)} บาท
        </div>
      </div>

      {errorMsg && (
        <div style={{ color: '#dc2626', marginBottom: 12, fontWeight: 600 }}>
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div style={{ color: '#16a34a', marginBottom: 12, fontWeight: 600 }}>
          {successMsg}
        </div>
      )}

      {loading ? (
        <p>กำลังโหลดสินค้า...</p>
      ) : (
        <>
          {/* ฟอร์มเลือกสินค้าเพิ่มลงตะกร้า */}
          <div className="card">
            <h2 style={{ marginTop: 0, fontSize: 18 }}>เพิ่มสินค้า</h2>
            <form
              onSubmit={handleAddToCart}
              style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}
            >
              <div style={{ flex: '1 1 220px' }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 13, color: '#6b7280' }}>
                  สินค้า
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="">-- เลือกสินค้า --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - {Number(p.price).toFixed(2)} บาท (คงเหลือ {p.stock})
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ width: 110 }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 13, color: '#6b7280' }}>
                  จำนวน
                </label>
                <input
                  type="number"
                  min="1"
                  value={addQty}
                  onChange={(e) => setAddQty(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
              <button type="submit">+ เพิ่มลงตะกร้า</button>
            </form>
          </div>

          {/* ตะกร้าสินค้า */}
          <div className="card">
            <h2 style={{ marginTop: 0, fontSize: 18 }}>รายการที่จะขาย</h2>
            {cart.length === 0 ? (
              <p style={{ color: '#9ca3af' }}>ยังไม่มีสินค้าในตะกร้า</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>สินค้า</th>
                    <th>ราคา/หน่วย</th>
                    <th>จำนวน</th>
                    <th>รวม</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item) => (
                    <tr key={item.productId}>
                      <td>{item.name}</td>
                      <td>{Number(item.price).toFixed(2)} / {item.unit}</td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleCartQtyChange(item.productId, e.target.value)}
                          style={{ width: 70 }}
                        />
                      </td>
                      <td style={{ fontWeight: 700 }}>
                        {(item.price * item.quantity).toFixed(2)}
                      </td>
                      <td>
                        <button
                          onClick={() => handleRemoveFromCart(item.productId)}
                          style={{ backgroundColor: '#dc2626' }}
                        >
                          ลบ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div
              style={{
                marginTop: 16,
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
              }}
            >
              <button
                onClick={resetAll}
                disabled={cart.length === 0 || submitting}
                style={{ backgroundColor: '#9ca3af' }}
              >
                ล้างตะกร้า
              </button>
              <button
                onClick={handleCheckout}
