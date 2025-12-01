#!/usr/bin/env python3
"""
GPU Detection Diagnostic Script
Tests for NVIDIA CUDA, AMD ROCm, DirectML, and general PyTorch GPU availability
"""

import sys
import platform

print("=" * 60)
print("GPU DETECTION DIAGNOSTIC")
print("=" * 60)
print()

# System info
print(f"Platform: {platform.system()} {platform.release()}")
print(f"Python version: {sys.version.split()[0]}")
print()

# Test PyTorch import
try:
    import torch
    print("✓ PyTorch imported successfully")
    print(f"  PyTorch version: {torch.__version__}")
except ImportError as e:
    print("✗ PyTorch not installed!")
    print(f"  Error: {e}")
    sys.exit(1)

print()
print("-" * 60)
print("DEVICE DETECTION TESTS")
print("-" * 60)
print()

# Test 1: torch.cuda.is_available()
print("1. NVIDIA CUDA Test:")
cuda_available = torch.cuda.is_available()
print(f"   torch.cuda.is_available() = {cuda_available}")

if cuda_available:
    print(f"   ✓ CUDA GPU detected!")
    print(f"   Device count: {torch.cuda.device_count()}")
    print(f"   Current device: {torch.cuda.current_device()}")
    print(f"   Device name: {torch.cuda.get_device_name(0)}")
else:
    print("   No CUDA devices detected")

print()

# Test 2: ROCm/HIP detection
print("2. AMD ROCm/HIP Test (Linux only):")
if hasattr(torch.version, 'hip'):
    print(f"   torch.version.hip exists: True")
    print(f"   torch.version.hip value: {torch.version.hip}")
    if torch.version.hip is not None:
        print("   ✓ ROCm support detected!")
    else:
        print("   ✗ ROCm attribute exists but is None")
else:
    print("   torch.version.hip exists: False")
    print("   No ROCm support in this PyTorch build")

print()

# Test 3: DirectML detection (Windows AMD/Intel GPUs)
print("3. DirectML Test (Windows AMD/Intel GPUs):")
directml_available = False
directml_device = None

if platform.system() == "Windows":
    try:
        import torch_directml
        directml_available = True
        print("   ✓ torch-directml imported successfully")

        try:
            directml_device = torch_directml.device()
            print(f"   ✓ DirectML device created: {directml_device}")

            # Try to get device info
            try:
                print(f"   Device type: {type(directml_device)}")
            except:
                pass

        except Exception as e:
            print(f"   ✗ Could not create DirectML device: {e}")

    except ImportError:
        print("   ✗ torch-directml not installed")
        print("   Install with: pip install torch-directml")
else:
    print("   DirectML only available on Windows")

print()

# Test 4: Check PyTorch build info
print("4. PyTorch Build Information:")
print(f"   CUDA compiled: {torch.version.cuda if torch.version.cuda else 'No'}")
if hasattr(torch.version, 'hip'):
    print(f"   HIP compiled: {torch.version.hip if torch.version.hip else 'No'}")
print(f"   CuDNN available: {torch.backends.cudnn.is_available()}")
if torch.backends.cudnn.is_available():
    print(f"   CuDNN version: {torch.backends.cudnn.version()}")

print()

# Test 5: Backend availability
print("5. Backend Tests:")
print(f"   CUDA backend built: {torch.backends.cuda.is_built()}")
print(f"   CuDNN backend available: {torch.backends.cudnn.is_available()}")

print()

# Test 6: Tensor creation test
print("6. Tensor Creation Test:")
try:
    if cuda_available:
        test_tensor = torch.randn(3, 3).cuda()
        print(f"   ✓ Successfully created tensor on CUDA GPU")
        print(f"   Tensor device: {test_tensor.device}")
    elif directml_available and directml_device:
        test_tensor = torch.randn(3, 3).to(directml_device)
        print(f"   ✓ Successfully created tensor on DirectML device")
        print(f"   Tensor device: {test_tensor.device}")
    else:
        test_tensor = torch.randn(3, 3)
        print(f"   CPU tensor created (no GPU available)")
        print(f"   Tensor device: {test_tensor.device}")
except Exception as e:
    print(f"   ✗ Error creating tensor: {e}")

print()

# Test 7: Performance test
print("7. Quick Performance Test:")
try:
    test_size = 1000
    iterations = 100

    import time

    if cuda_available:
        device = "cuda"
        test_tensor = torch.randn(test_size, test_size).cuda()
    elif directml_available and directml_device:
        device = directml_device
        test_tensor = torch.randn(test_size, test_size).to(directml_device)
    else:
        device = "cpu"
        test_tensor = torch.randn(test_size, test_size)

    # Warmup
    for _ in range(10):
        _ = torch.matmul(test_tensor, test_tensor)

    # Timed test
    start_time = time.time()
    for _ in range(iterations):
        result = torch.matmul(test_tensor, test_tensor)
    elapsed = time.time() - start_time

    print(f"   Device: {device}")
    print(f"   Matrix size: {test_size}x{test_size}")
    print(f"   Iterations: {iterations}")
    print(f"   Time: {elapsed:.3f} seconds")
    print(f"   Operations/sec: {iterations/elapsed:.1f}")

except Exception as e:
    print(f"   ✗ Performance test failed: {e}")

print()
print("-" * 60)
print("SUMMARY & RECOMMENDATIONS")
print("-" * 60)
print()

# Determine best available option
if cuda_available:
    print("✓ NVIDIA CUDA GPU DETECTED - Best performance!")
    print("  Your setup is optimal for GPU acceleration")
elif directml_available and directml_device:
    print("✓ DirectML GPU DETECTED - Good performance!")
    print("  AMD/Intel GPU acceleration is working")
elif hasattr(torch.version, 'hip') and torch.version.hip is not None:
    print("✓ ROCm support detected")
    print("  Note: ROCm works best on Linux")
else:
    print("⚠ CPU ONLY - No GPU acceleration detected")
    print()

    if platform.system() == "Windows":
        if not directml_available:
            print("For AMD/Intel GPUs on Windows:")
            print("  1. Install torch-directml:")
            print("     pip install torch-directml")
            print()

        print("For NVIDIA GPUs:")
        print("  1. Uninstall current PyTorch:")
        print("     pip uninstall torch torchvision")
        print("  2. Install CUDA version:")
        print("     pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121")
    else:
        print("For AMD GPUs on Linux:")
        print("  1. Install ROCm version:")
        print("     pip install torch torchvision --index-url https://download.pytorch.org/whl/rocm6.0")
        print()
        print("For NVIDIA GPUs:")
        print("  1. Install CUDA version:")
        print("     pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121")

print()
print("=" * 60)
print()

# Show what classify_cloudinary.py will use
print("WHAT classify_cloudinary.py WILL USE:")
print("-" * 60)

if cuda_available:
    print("Device: NVIDIA CUDA GPU")
    print(f"Name: {torch.cuda.get_device_name(0)}")
elif hasattr(torch.version, 'hip') and torch.version.hip is not None:
    print("Device: AMD ROCm GPU")
elif directml_available and directml_device:
    print("Device: DirectML (AMD/Intel GPU)")
else:
    print("Device: CPU")
    if platform.system() == "Windows" and not directml_available:
        print("Recommendation: Install torch-directml for GPU acceleration")

print()
print("=" * 60)
