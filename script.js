// ====================================================
// ✅ EL TAYYIBAT - script.js (ملف المستخدم الأساسي)
// ====================================================

const $ = sel => document.querySelector(sel);
const uid = () => Date.now().toString(36);

// =======================
// ✅ LocalStorage Shortcuts
// =======================
function fetchCart(){ return JSON.parse(localStorage.getItem('et_cart') || '[]'); }
function saveCart(arr){ localStorage.setItem('et_cart', JSON.stringify(arr)); }

function fetchProducts(){ return JSON.parse(localStorage.getItem('et_products') || '[]'); }
function saveProducts(arr){ localStorage.setItem('et_products', JSON.stringify(arr)); }

function fetchOrders(){ return JSON.parse(localStorage.getItem('et_orders') || '[]'); }
function saveOrders(arr){ localStorage.setItem('et_orders', JSON.stringify(arr)); }

function fetchFeedback(){ return JSON.parse(localStorage.getItem('et_feedback') || '[]'); }
function saveFeedback(arr){ localStorage.setItem('et_feedback', JSON.stringify(arr)); }

// =======================
// ✅ CART ICON COUNT
// =======================
function updateCartCount(){
  const badge = $("#cartCountNav");
  if (badge) badge.textContent = fetchCart().length;
}

// =======================
// ✅ Render Products (now includes qty input and uses p.id)
// =======================
function renderProducts(){
  const arr = fetchProducts();
  const grid = $("#productGrid");
  if(!grid) return;

  grid.innerHTML = "";
  arr.forEach((p,i)=>{
    // unique qty input id per product
    const qtyInputId = `prod_qty_${p.id}`;
    grid.innerHTML += `
      <div class="col-md-4 col-sm-6">
        <div class="card product-card p-2 shadow-sm">
          <img src="${p.img}" class="product-img mb-2 rounded" alt="${p.name}">
          <h5 class="text-dark">${p.name}</h5>
          <p class="text-danger fw-bold">${p.price} ج.م</p>
          <div class="d-flex gap-2 align-items-center mb-2">
            <input id="${qtyInputId}" type="number" step="0.1" min="0.1" value="1" class="form-control" style="max-width:100px;">
            <button class="btn btn-sm btn-success" onclick="addToCartFromCard('${p.id}')">أضف للسلة 🛒</button>
            <button class="btn btn-sm btn-warning" onclick="openProduct(${i})">عرض 👁</button>
            <button class="btn btn-sm btn-danger" onclick="orderNow(${i})">اطلب الآن ⚡</button>
          </div>
        </div>
      </div>
    `;
  });

  // =======================
  // ✅ ملء قائمة الطلب تلقائياً
  // =======================
  const select = $("#orderProduct");
  if(select){
    select.innerHTML = '<option value="">اختر منتج...</option>';
    arr.forEach(p=>{
      select.innerHTML += `<option value="${p.id}">${p.name} — ${p.price} ج.م</option>`;
    });
  }
}

// =======================
// ✅ Add to Cart from Product Card (reads qty input beside the card)
// =======================
function addToCartFromCard(productId){
  const p = fetchProducts().find(x=> x.id == productId);
  if(!p) return alert("المنتج غير موجود");

  const qtyEl = document.getElementById(`prod_qty_${p.id}`);
  let qty = qtyEl ? parseFloat(qtyEl.value) || 1 : 1;
  if(qty <= 0) qty = 1;

  const cart = fetchCart();
  const exist = cart.find(x=> x.id == p.id);
  if(exist) exist.qty = (parseFloat(exist.qty) || 0) + qty;
  else cart.push({ id: p.id, name: p.name, price: p.price, qty });

  saveCart(cart);
  updateCartCount();
  renderCartModal(); // تحديث المودال لو مفتوح
  alert(`✅ تم إضافة ${qty} ${p.name} للسلة`);
}

// =======================
// ✅ عند اختيار "اطلب الآن" من بطاقة المنتج
// =======================
function orderNow(i){
  const product = fetchProducts()[i];
  if(!product) return;
  $("#orderProduct").value = product.id;
  // حط القيمة في input الكميه داخل النموذج
  const orderQty = $("#orderQty");
  if(orderQty) orderQty.value = 1;
  window.scrollTo({ top: $("#order").offsetTop - 60, behavior: "smooth" });
}

// =======================
// ✅ زر "أضف للسلة" في نموذج الطلب (يدعم كيلو/قطع)
// =======================
$("#addToCartBtn")?.addEventListener("click", ()=>{
  const selectedId = $("#orderProduct").value;
  let qty = parseFloat($("#orderQty")?.value || 1) || 1; // يدعم الوحدات أو الكيلو
  if(!selectedId) return alert("اختر المنتج أولاً");

  const p = fetchProducts().find(x=>x.id == selectedId);
  if(!p) return alert("المنتج غير موجود");

  const cart = fetchCart();
  const exist = cart.find(x=>x.id == selectedId);

  if(exist) exist.qty = (parseFloat(exist.qty) || 0) + qty;
  else cart.push({id:p.id, name:p.name, price:p.price, qty});

  saveCart(cart);
  updateCartCount();
  renderCartModal();
  alert(`✅ تم إضافة ${qty} ${p.name} للسلة`);
  $("#orderQty").value = 1;
  $("#orderProduct").value = "";
});

// =======================
// 🔴 (تم التعديل) 🔴 Submit Order (يدعم الفاتورة العربية)
// =======================
$("#orderForm")?.addEventListener("submit", e=>{
  e.preventDefault();

  let cart = fetchCart();
  const id = $("#orderProduct").value;
  const qty = parseFloat($("#orderQty")?.value || 1) || 1;

  if(cart.length === 0 && id){
    const p = fetchProducts().find(x => x.id == id);
    if(p){ // التحقق أن المنتج موجود
        cart.push({id:p.id, name:p.name, price:p.price, qty});
        saveCart(cart);
    }
  }

  cart = fetchCart();
  if(cart.length === 0) return alert("السلة فارغة");

  const orders = fetchOrders();

  // إعدادات التاريخ والوقت بالعربي لمصر
  const dateOptions = {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Africa/Cairo',
    hour12: true // استخدام نظام 12 ساعة (صباحاً/مساءً)
  };
  const arabicDate = new Date().toLocaleString('ar-EG', dateOptions);
  
  // (--- 🔴 تعديل رئيسي هنا 🔴 ---)
  // تم تغيير المفاتيح إلى العربية
  const order = {
    "رقم_الطلب": orders.length + 1,
    "العميل": $("#custName").value,
    "الهاتف": $("#custPhone").value,
    "العنوان": $("#orderAddress").value,
    "المنتجات": cart, // مصفوفة المنتجات (تظل كما هي داخلياً)
    "الإجمالي": cart.reduce((s,x)=> s + x.price*parseFloat(x.qty),0),
    "التاريخ": arabicDate, // استخدام التاريخ العربي
    "تم": false // إضافة حالة الطلب
  };
  // (--- نهاية التعديل ---)

  orders.unshift(order);
  saveOrders(orders);

  localStorage.removeItem('et_cart');
  updateCartCount();
  renderCartModal(); // تحديث المودال بعد إفراغ السلة
  $("#orderForm").reset();
  alert("✅ تم إرسال الطلب للأدمن!");

  // 🔴 إنشاء وعرض الفاتورة بالعربية بعد إرسال الطلب
  // توليد HTML الفاتورة
  try {
    const invoiceHTML = `
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>فاتورة طلب</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Cairo', sans-serif; direction: rtl; text-align: right; padding: 30px; }
          h1, h2, h3 { text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ccc; padding: 8px; }
          th { background: #f0f0f0; }
          .total { font-weight: bold; text-align: left; }
          .footer { text-align: center; margin-top: 40px; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <h1>فاتورة طلب</h1>
        <h3>العميل: ${order["العميل"]}</h3>
        <p>الهاتف: ${order["الهاتف"]}</p>
        <p>العنوان: ${order["العنوان"] || "—"}</p>
        <p>التاريخ: ${order["التاريخ"]}</p>

        <table>
          <tr>
            <th>المنتج</th>
            <th>السعر</th>
            <th>الكمية</th>
            <th>الإجمالي</th>
          </tr>
          ${order["المنتجات"].map(p => `
            <tr>
              <td>${p.name}</td>
              <td>${p.price} ج.م</td>
              <td>${p.qty}</td>
              <td>${(p.price * p.qty).toFixed(2)} ج.م</td>
            </tr>
          `).join('')}
          <tr>
            <td colspan="3" class="total">الإجمالي الكلي</td>
            <td class="total">${order["الإجمالي"].toFixed(2)} ج.م</td>
          </tr>
        </table>

        <div class="footer">
          <p>شكراً لتعاملكم مع <strong>الطيبات للحلاوة الطحينية</strong></p>
          <p>يمكنك طباعة هذه الفاتورة للاحتفاظ بها</p>
        </div>
      </body>
      </html>
    `;

    const w = window.open('', '_blank');
    w.document.write(invoiceHTML);
    w.document.close();
  } catch (err){
    console.error("خطأ أثناء إنشاء معاينة الفاتورة:", err);
  }
});

// =======================
// ✅ Feedback
// =======================
$("#feedbackForm")?.addEventListener("submit", e=>{
  e.preventDefault();
  const arr = fetchFeedback();
  arr.unshift({
    name: $("#name").value,
    type: $("#type").value,
    msg: $("#message").value,
    date: new Date().toLocaleString()
  });
  saveFeedback(arr);
  $("#feedbackForm").reset();
  $("#formResponse").textContent = "✅ تم إرسال رسالتك";
});

// =======================
// ✅ Cart Modal (renders details + total) - single source of truth
// =======================
function renderCartModal(){
  const cart = fetchCart();
  const box = $("#cartItems");
  const totalLbl = $("#cartTotal");

  if(!box) return;

  if(cart.length === 0){
    box.innerHTML = `<p class="text-center text-muted">السلة فارغة</p>`;
    totalLbl.textContent = "الإجمالي: 0 ج.م";
    return;
  }

  let total = 0;
  let html = "";
  cart.forEach((c,i)=>{
    const lineTotal = (parseFloat(c.price) || 0) * (parseFloat(c.qty) || 0);
    total += lineTotal;
    html += `
      <div class="d-flex justify-content-between align-items-center p-2 border-bottom">
        <div>
          <strong>${c.name}</strong><br>
          <small>${c.price} ج.م × ${c.qty}</small>
        </div>
        <div class="d-flex gap-2 align-items-center">
          <span class="fw-bold">${lineTotal.toFixed(2)} ج.م</span>
          <button class="btn btn-sm btn-danger" onclick="removeFromCart(${i})">حذف</button>
        </div>
      </div>
    `;
  });

  box.innerHTML = html;
  totalLbl.textContent = `الإجمالي: ${total.toFixed(2)} ج.م`;
}

// =======================
// ✅ Remove from Cart
// =======================
function removeFromCart(i){
  const cart = fetchCart();
  cart.splice(i,1);
  saveCart(cart);
  updateCartCount();
  renderCartModal();
}

// =======================
// ✅ Cart Button
// =======================
$("#cartBtn")?.addEventListener("click", ()=>{
  renderCartModal();
  const modalEl = $("#cartModal");
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.show();
});

// =======================
// ✅ Checkout Button → يحول لنموذج الطلب
// =======================
$("#checkoutBtn")?.addEventListener("click", ()=>{
  const modalEl = $("#cartModal");
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.hide();

  // نملأ الحقول بنقاط مهمة (لو في أول عنصر نقدر نعبي المنتج تلقائياً)
  // فقط تمرير المستخدم للنموذج
  setTimeout(()=> {
    window.scrollTo({ top: $("#order").offsetTop - 60, behavior: "smooth" });
  }, 200);
});


// =======================
// ✅ Add to Cart (kept for compatibility) - expects index i -> convert to productId
// =======================
function addToCart(i){
  // legacy function kept: accepts index
  const arr = fetchProducts();
  const p = arr[i];
  if(!p) return alert("المنتج غير موجود");
  // try to read card qty if present
  const qtyEl = document.getElementById(`prod_qty_${p.id}`);
  let qty = qtyEl ? parseFloat(qtyEl.value) || 1 : 1;
  const cart = fetchCart();
  const exist = cart.find(x=>x.id===p.id);
  if(exist) exist.qty = (parseFloat(exist.qty) || 0) + qty;
  else cart.push({...p, qty});
  saveCart(cart);
  updateCartCount();
  alert("✅ تم إضافة المنتج للسلة");
}

// =======================
// ✅ Open Product -> fills product detail modal and shows it
// =======================
function openProduct(i){
  const p = fetchProducts()[i];
  if(!p) return alert("المنتج غير موجود");
  // fill modal
  $("#pd_title").textContent = p.name;
  $("#pd_img").src = p.img || '';
  $("#pd_img").alt = p.name;
  $("#pd_desc").textContent = p.desc || '';
  $("#pd_price").textContent = (p.price ? p.price + ' ج.م' : '');
  $("#pd_qty").value = 1;

  // remove existing listeners to prevent duplicates
  const newAdd = $("#pd_addBtn");
  const newOrder = $("#pd_orderNowBtn");
  // replace with fresh clones to remove old listeners
  const newAddClone = newAdd.cloneNode(true);
  newAdd.parentNode.replaceChild(newAddClone, newAdd);
  const newOrderClone = newOrder.cloneNode(true);
  newOrder.parentNode.replaceChild(newOrderClone, newOrder);

  // add listeners
  newAddClone.addEventListener('click', ()=>{
    const qty = parseFloat($("#pd_qty").value) || 1;
    const cart = fetchCart();
    const exist = cart.find(x=> x.id == p.id);
    if(exist) exist.qty = (parseFloat(exist.qty) || 0) + qty;
    else cart.push({ id: p.id, name: p.name, price: p.price, qty });
    saveCart(cart);
    updateCartCount();
    renderCartModal();
    const modalEl = $("#productDetailModal");
    bootstrap.Modal.getOrCreateInstance(modalEl).hide();
    alert(`✅ تم إضافة ${qty} ${p.name} للسلة`);
  });

  newOrderClone.addEventListener('click', ()=>{
    // close modal and go to order form and preselect product
    bootstrap.Modal.getOrCreateInstance($("#productDetailModal")).hide();
    setTimeout(()=> {
      $("#orderProduct").value = p.id;
      $("#orderQty").value = 1;
      window.scrollTo({ top: $("#order").offsetTop - 60, behavior: "smooth" });
    }, 200);
  });

  // show modal
  bootstrap.Modal.getOrCreateInstance($("#productDetailModal")).show();
}

// =======================
// ✅ تحديد الموقع تلقائياً
// =======================
$("#getLocationBtn")?.addEventListener("click", ()=>{
  if(!navigator.geolocation){
    return alert("🚫 جهازك لا يدعم تحديد الموقع");
  }
  const btn = $("#getLocationBtn");
  btn.textContent = "جاري تحديد الموقع...";
  navigator.geolocation.getCurrentPosition(
    pos=>{
      const {latitude, longitude} = pos.coords;
      // تم تعديل الرابط ليكون رابط خرائط جوجل قابل للضغط عليه
      $("#orderAddress").value = `https://www.google.com/maps?q=${latitude},${longitude}`;
      btn.textContent = "تم تحديد الموقع تلقائياً";
    },
    err=>{
      console.error(err);
      alert("🚫 فشل في الحصول على الموقع");
      btn.textContent = "تحديد الموقع تلقائياً";
    },
    { timeout: 15000 }
  );
});


// =======================
// ✅ Init
// =======================
window.addEventListener("load", ()=>{
  renderProducts();
  updateCartCount();
  // تم حذف استدعاءات دوال الأدمن من هنا
});