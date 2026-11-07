
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../../providers";
import { apiRequest } from "../../../../lib/api";

const EMPTY_FORM = {
  mill_inventory_id: "",
  product_name: "",
  category: "",
  price: "0",
  description: "",
  status: "Available",
};

const STATUS_OPTIONS = ["Available", "Inactive"];

const BACKEND_ORIGIN =
  process.env.NEXT_PUBLIC_BACKEND_ORIGIN || "http://127.0.0.1:3000";

// RESPONSE HELPERS

function getResponseData(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.records)) return response.records;
  if (Array.isArray(response?.data?.records)) return response.data.records;

  return [];
}

function getInventoryId(inventory) {
  return inventory?.id ?? inventory?.mill_inventory_id;
}

function getImageUrl(path) {
  if (!path) return "";

  if (/^https?:\/\//i.test(path)) return path;

  return `${BACKEND_ORIGIN}${path.startsWith("/") ? "" : "/"}${path}`;
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP",
  });
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-PH");
}

// MILL INVENTORY HELPERS
// IMPORTANT: Use the actual database fields.

function getInventoryStock(inventory) {
  return Number(inventory?.stock_quantity ?? 0);
}

function getInventorySacks(inventory) {
  return Number(inventory?.sack_quantity ?? 0);
}

function getInventorySackSize(inventory) {
  if (!inventory) return 0;

  // Directly read sack_weight_kg from Mill Inventory.
  return Number(inventory.sack_weight_kg ?? 0);
}

function isLooseRice(inventory) {
  if (!inventory) return false;

  return getInventorySackSize(inventory) <= 0;
}

function getInventoryDisplaySize(inventory) {
  if (!inventory) return "—";

  const sackSize = getInventorySackSize(inventory);

  if (sackSize > 0) {
    return `${formatNumber(sackSize)} kg Sack`;
  }

  return "Loose Rice (Per kg)";
}

function formatInventoryStock(inventory) {
  if (!inventory) return "No linked inventory";

  const stock = getInventoryStock(inventory);
  const sacks = getInventorySacks(inventory);
  const sackSize = getInventorySackSize(inventory);

  if (sackSize > 0) {
    return `${formatNumber(sacks)} sacks / ${formatNumber(stock)} kg`;
  }

  return `${formatNumber(stock)} kg`;
}

function getProductStatus(product, inventory) {
  if (product.status === "Inactive") {
    return "Inactive";
  }

  if (!inventory) {
    return "Out of Stock";
  }

  return getInventoryStock(inventory) > 0
    ? "Available"
    : "Out of Stock";
}

// MAIN COMPONENT

export default function ProductsPage() {
  const { session } = useAuth();

  const token = session?.accessToken;
  const fileInputRef = useRef(null);

  const [products, setProducts] = useState([]);
  const [inventories, setInventories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);

  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [removeImage, setRemoveImage] = useState(false);

  // LOAD PRODUCTS AND INVENTORY

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [productResponse, inventoryResponse] = await Promise.all([
        apiRequest("sales/products", { token }),
        apiRequest("mill/inventory", { token }),
      ]);

      setProducts(getResponseData(productResponse));
      setInventories(getResponseData(inventoryResponse));
    } catch (err) {
      setError(err.message || "Unable to load products and inventory.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token, loadData]);

  // INVENTORY LOOKUP

  const inventoryMap = useMemo(() => {
    return new Map(
      inventories.map((inventory) => [
        String(getInventoryId(inventory)),
        inventory,
      ])
    );
  }, [inventories]);

  const getLinkedInventory = useCallback(
    (product) => {
      return inventoryMap.get(String(product.mill_inventory_id)) || null;
    },
    [inventoryMap]
  );

  const selectedInventory = useMemo(() => {
    return inventoryMap.get(String(form.mill_inventory_id)) || null;
  }, [inventoryMap, form.mill_inventory_id]);

  // FILTER PRODUCTS

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return products.filter((product) => {
      const inventory = getLinkedInventory(product);

      const searchValues = [
        product.product_name,
        product.category,
        product.description,
        inventory?.item_name,
        inventory?.variety,
        inventory?.sack_weight_kg,
        inventory?.sack_quantity,
      ];

      const matchesSearch =
        !keyword ||
        searchValues
          .filter((value) => value !== null && value !== undefined)
          .some((value) =>
            String(value).toLowerCase().includes(keyword)
          );

      const status = getProductStatus(product, inventory);

      const matchesStatus =
        statusFilter === "All" || status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [products, search, statusFilter, getLinkedInventory]);

  // SUMMARY

  const summary = useMemo(() => {
    const available = products.filter(
      (product) =>
        getProductStatus(product, getLinkedInventory(product)) === "Available"
    ).length;

    const outOfStock = products.filter(
      (product) =>
        getProductStatus(product, getLinkedInventory(product)) === "Out of Stock"
    ).length;

    const inactive = products.filter(
      (product) => product.status === "Inactive"
    ).length;

    return {
      total: products.length,
      available,
      outOfStock,
      inactive,
    };
  }, [products, getLinkedInventory]);

  // IMAGE HANDLING

  function resetImage() {
    if (imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setSelectedImage(null);
    setImagePreview("");
    setRemoveImage(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Only JPG, PNG, and WEBP images are allowed.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must not exceed 5 MB.");
      event.target.value = "";
      return;
    }

    if (imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setError("");
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
    setRemoveImage(false);
  }

  function handleRemoveImage() {
    resetImage();
    setRemoveImage(true);
  }

  // MODAL HANDLING

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    resetImage();
    setError("");
  }

  function openAddModal() {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    resetImage();
    setError("");
    setModalOpen(true);
  }

  function openEditModal(product) {
    setEditingProduct(product);

    setForm({
      mill_inventory_id: String(product.mill_inventory_id ?? ""),
      product_name: product.product_name ?? "",
      category: product.category ?? "",
      price: String(product.price ?? "0"),
      description: product.description ?? "",
      status: product.status === "Inactive" ? "Inactive" : "Available",
    });

    resetImage();

    if (product.image) {
      setImagePreview(getImageUrl(product.image));
    }

    setError("");
    setModalOpen(true);
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // SAVE PRODUCT

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.product_name.trim()) {
      setError("Product name is required.");
      return;
    }

    if (!form.mill_inventory_id || !selectedInventory) {
      setError("Please select a valid Mill Inventory record.");
      return;
    }

    if (getInventoryStock(selectedInventory) <= 0) {
      setError("The selected inventory has no available stock.");
      return;
    }

    if (
      form.price === "" ||
      !Number.isFinite(Number(form.price)) ||
      Number(form.price) < 0
    ) {
      setError("Please enter a valid selling price.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    const formData = new FormData();

    formData.append("mill_inventory_id", form.mill_inventory_id);
    formData.append("product_name", form.product_name.trim());
    formData.append("category", form.category.trim());
    formData.append("price", form.price);
    formData.append("description", form.description.trim());
    formData.append("status", form.status);

    // Sack quantity, sack weight, and stock quantity
    // are NOT submitted.
    // All are retrieved from the linked Mill Inventory.

    formData.append(
      "image",
      editingProduct?.image && !removeImage ? editingProduct.image : ""
    );

    if (selectedImage) {
      formData.append("image_file", selectedImage);
    }

    if (editingProduct && removeImage) {
      formData.append("remove_image", "1");
    }

    try {
      if (editingProduct) {
        await apiRequest(`sales/products/${editingProduct.id}`, {
          method: "PUT",
          token,
          body: formData,
        });

        setNotice("Product updated successfully.");
      } else {
        await apiRequest("sales/products", {
          method: "POST",
          token,
          body: formData,
        });

        setNotice("Product added successfully.");
      }

      setModalOpen(false);
      setEditingProduct(null);
      setForm(EMPTY_FORM);
      resetImage();

      await loadData();
    } catch (err) {
      setError(err.message || "Unable to save product.");
    } finally {
      setSaving(false);
    }
  }

  // DELETE PRODUCT

  async function handleDelete(product) {
    const inventory = getLinkedInventory(product);

    const confirmed = window.confirm(
      `Are you sure you want to delete "${product.product_name}" (${getInventoryDisplaySize(inventory)})?`
    );

    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      await apiRequest(`sales/products/${product.id}`, {
        method: "DELETE",
        token,
      });

      setNotice("Product deleted successfully.");
      await loadData();
    } catch (err) {
      setError(err.message || "Unable to delete product.");
    }
  }

  // PAGE

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-800 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* HEADER */}

        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-900">
              Sales Management
            </p>

            <h1 className="font-serif text-3xl font-semibold text-slate-900">
              Products
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Manage rice product listings, selling prices, and product images.
              Sack information and available stock are automatically retrieved
              from Mill Inventory.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="rounded-xl bg-blue-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            + Add Product
          </button>
        </header>

        {/* ALERTS */}

        {error && !modalOpen && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {notice && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {notice}
          </div>
        )}

        {/* SUMMARY */}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Total Products"
            value={formatNumber(summary.total)}
          />

          <SummaryCard
            label="Available Products"
            value={formatNumber(summary.available)}
          />

          <SummaryCard
            label="Out of Stock"
            value={formatNumber(summary.outOfStock)}
          />

          <SummaryCard
            label="Inactive Products"
            value={formatNumber(summary.inactive)}
          />
        </section>

        {/* PRODUCTS TABLE */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Product Listings
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Sack details and available stock are linked directly to Mill Inventory.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search products..."
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none focus:border-blue-800"
              />

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-800"
              >
                <option value="All">All Status</option>
                <option value="Available">Available</option>
                <option value="Out of Stock">Out of Stock</option>
                <option value="Inactive">Inactive</option>
              </select>

              <button
                type="button"
                onClick={loadData}
                disabled={loading}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">

              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-4">Image</th>
                  <th className="px-5 py-4">Product</th>
                  <th className="px-5 py-4">Inventory Source</th>
                  <th className="px-5 py-4">Category</th>
                  <th className="px-5 py-4">Sack Size</th>
                  <th className="px-5 py-4">Selling Price</th>
                  <th className="px-5 py-4">Available Stock</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">

                {loading ? (
                  <tr>
                    <td colSpan="9" className="px-5 py-12 text-center text-slate-500">
                      Loading products...
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-5 py-12 text-center text-slate-500">
                      No products found.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => {
                    const inventory = getLinkedInventory(product);
                    const status = getProductStatus(product, inventory);

                    return (
                      <tr
                        key={product.id}
                        className="transition hover:bg-slate-50"
                      >

                        {/* IMAGE */}

                        <td className="px-5 py-3">
                          {product.image ? (
                            <img
                              src={getImageUrl(product.image)}
                              alt={product.product_name}
                              className="h-14 w-14 rounded-xl border border-slate-200 object-cover"
                            />
                          ) : (
                            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-400">
                              No image
                            </div>
                          )}
                        </td>

                        {/* PRODUCT */}

                        <td className="px-5 py-3">
                          <p className="font-semibold text-slate-900">
                            {product.product_name}
                          </p>

                          {product.description && (
                            <p className="mt-1 max-w-[200px] truncate text-xs text-slate-500">
                              {product.description}
                            </p>
                          )}
                        </td>

                        {/* INVENTORY SOURCE */}

                        <td className="px-5 py-3">
                          {inventory ? (
                            <>
                              <p className="font-medium text-slate-800">
                                {inventory.item_name}
                              </p>

                              {inventory.variety && (
                                <p className="mt-1 text-xs text-slate-500">
                                  {inventory.variety}
                                </p>
                              )}

                              <p className="mt-1 text-xs text-blue-800">
                                Inventory #{getInventoryId(inventory)}
                              </p>
                            </>
                          ) : (
                            <span className="text-xs text-red-600">
                              Inventory not found
                            </span>
                          )}
                        </td>

                        {/* CATEGORY */}

                        <td className="px-5 py-3">
                          {product.category || "—"}
                        </td>

                        {/* AUTOMATIC SACK SIZE */}

                        <td className="px-5 py-3">
                          <span className="inline-flex rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-900">
                            {getInventoryDisplaySize(inventory)}
                          </span>
                        </td>

                        {/* PRICE */}

                        <td className="px-5 py-3 font-semibold text-slate-900">
                          {formatCurrency(product.price)}

                          <p className="mt-1 text-xs font-normal text-slate-500">
                            {isLooseRice(inventory) ? "Per kg" : "Per sack"}
                          </p>
                        </td>

                        {/* INVENTORY STOCK */}

                        <td className="px-5 py-3">
                          <p className="font-semibold text-slate-800">
                            {inventory
                              ? formatInventoryStock(inventory)
                              : "—"}
                          </p>
                        </td>

                        {/* STATUS */}

                        <td className="px-5 py-3">
                          <StatusBadge status={status} />
                        </td>

                        {/* ACTIONS */}

                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-2">

                            <button
                              type="button"
                              onClick={() => openEditModal(product)}
                              className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-900 hover:bg-blue-50"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(product)}
                              className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                            >
                              Delete
                            </button>

                          </div>
                        </td>

                      </tr>
                    );
                  })
                )}

              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-200 px-5 py-4 text-xs text-slate-500">
            Showing {filteredProducts.length} of {products.length} products
          </div>

        </section>
      </div>

      {/* ADD / EDIT PRODUCT MODAL */}

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 sm:p-5">

          <div className="flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-blue-900">
                  Product Management
                </p>

                <h2 className="mt-1 font-serif text-xl font-semibold text-slate-900">
                  {editingProduct ? "Edit Product" : "Add Product"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg px-3 py-2 text-xl text-slate-500 hover:bg-slate-100"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex min-h-0 flex-1 flex-col"
            >

              <div className="flex-1 space-y-5 overflow-y-auto p-6">

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                {/* PRODUCT IMAGE */}

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Product Image
                  </label>

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">

                    <div className="flex h-36 w-36 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Product preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="text-center text-xs text-slate-400">
                          <div className="mb-2 text-3xl">▧</div>
                          No image selected
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImageChange}
                        className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-900 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-blue-800"
                      />

                      <p className="text-xs text-slate-500">
                        JPG, PNG, or WEBP. Maximum file size: 5 MB.
                      </p>

                      {imagePreview && (
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="text-xs font-semibold text-red-600 hover:underline"
                        >
                          Remove image
                        </button>
                      )}
                    </div>

                  </div>
                </div>

                {/* PRODUCT DETAILS */}

                <div className="grid gap-4 sm:grid-cols-2">

                  <FormField label="Product Name" required>
                    <input
                      name="product_name"
                      value={form.product_name}
                      onChange={handleChange}
                      required
                      maxLength={150}
                      className={inputClass}
                      placeholder="e.g. Premium Rice"
                    />
                  </FormField>

                  <FormField label="Category">
                    <input
                      name="category"
                      value={form.category}
                      onChange={handleChange}
                      maxLength={50}
                      className={inputClass}
                      placeholder="e.g. Premium"
                    />
                  </FormField>

                  {/* LINKED MILL INVENTORY */}

                  <div className="sm:col-span-2">

                    <FormField label="Linked Mill Inventory" required>
                      <select
                        name="mill_inventory_id"
                        value={form.mill_inventory_id}
                        onChange={handleChange}
                        required
                        className={inputClass}
                      >
                        <option value="">
                          Select Mill Inventory Record
                        </option>

                        {inventories.map((inventory) => (
                          <option
                            key={getInventoryId(inventory)}
                            value={getInventoryId(inventory)}
                          >
                            {inventory.item_name}
                            {inventory.variety
                              ? ` - ${inventory.variety}`
                              : ""}
                            {` - ${getInventoryDisplaySize(inventory)}`}
                            {` - ${formatInventoryStock(inventory)}`}
                          </option>
                        ))}

                      </select>
                    </FormField>

                    {inventories.length === 0 ? (
                      <p className="mt-2 text-xs text-red-600">
                        No Mill Inventory records available. Add an inventory
                        record first.
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-slate-500">
                        Select an inventory record. Sack size, sack quantity,
                        and stock will automatically be retrieved.
                      </p>
                    )}

                  </div>

                  {/* AUTOMATIC INVENTORY INFORMATION */}

                  <div className="sm:col-span-2">

                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">

                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-blue-900">
                            Mill Inventory Information
                          </p>

                          <p className="mt-1 text-xs text-blue-700">
                            Automatically retrieved. Read-only.
                          </p>
                        </div>

                        <span className="rounded-lg bg-white px-3 py-2 text-sm font-bold text-blue-900">
                          {selectedInventory
                            ? getInventoryDisplaySize(selectedInventory)
                            : "No selection"}
                        </span>
                      </div>

                      {selectedInventory && (
                        <div className="mt-3 grid grid-cols-2 gap-3 border-t border-blue-200 pt-3">

                          <div>
                            <p className="text-xs text-blue-700">
                              Inventory Item
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-800">
                              {selectedInventory.item_name || "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-blue-700">
                              Rice Variety
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-800">
                              {selectedInventory.variety || "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-blue-700">
                              Sack Quantity
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-800">
                              {getInventorySackSize(selectedInventory) > 0
                                ? `${formatNumber(getInventorySacks(selectedInventory))} sacks`
                                : "Not applicable"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-blue-700">
                              Sack Weight
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-800">
                              {getInventorySackSize(selectedInventory) > 0
                                ? `${formatNumber(getInventorySackSize(selectedInventory))} kg per sack`
                                : "Loose Rice"}
                            </p>
                          </div>

                          <div className="col-span-2 border-t border-blue-200 pt-3">
                            <p className="text-xs text-blue-700">
                              Current Available Stock
                            </p>

                            <p className="mt-1 text-lg font-bold text-blue-900">
                              {formatNumber(getInventoryStock(selectedInventory))} kg
                            </p>

                            <p className="mt-1 text-xs text-blue-700">
                              Source: Mill Inventory
                            </p>
                          </div>

                        </div>
                      )}

                      {!selectedInventory && (
                        <p className="mt-3 border-t border-blue-200 pt-3 text-xs text-blue-700">
                          Select an inventory record to automatically
                          display its sack quantity, sack weight, and stock.
                        </p>
                      )}

                    </div>

                  </div>

                  {/* SELLING PRICE */}

                  <FormField
                    label={
                      selectedInventory && isLooseRice(selectedInventory)
                        ? "Selling Price per Kilogram"
                        : "Selling Price per Sack"
                    }
                    required
                  >
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                        ₱
                      </span>

                      <input
                        name="price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.price}
                        onChange={handleChange}
                        required
                        className={`${inputClass} pl-8`}
                        placeholder="0.00"
                      />
                    </div>
                  </FormField>

                  {/* STATUS */}

                  <FormField label="Status" required>
                    <select
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                      className={inputClass}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  {/* DESCRIPTION */}

                  <div className="sm:col-span-2">
                    <FormField label="Description">
                      <textarea
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        rows={4}
                        className={inputClass}
                        placeholder="Enter product description..."
                      />
                    </FormField>
                  </div>

                </div>

              </div>

              {/* MODAL FOOTER */}

              <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || inventories.length === 0}
                  className="rounded-xl bg-blue-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingProduct
                      ? "Update Product"
                      : "Save Product"}
                </button>

              </div>

            </form>
          </div>
        </div>
      )}

    </main>
  );
}

// REUSABLE COMPONENTS

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-100";

function FormField({ label, required, children }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {children}
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p className="mt-3 text-2xl font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    Available: "bg-green-50 text-green-700",
    "Out of Stock": "bg-red-50 text-red-700",
    Inactive: "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        styles[status] || "bg-slate-100 text-slate-600"
      }`}
    >
      {status || "Unknown"}
    </span>
  );
}
