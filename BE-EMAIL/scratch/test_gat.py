import sys
import os
import torch
import pandas as pd

# Add app to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.ml.gat import SpamGAT, build_sparse_graph

def test_gat_architecture():
    print("="*60)
    print("🧪 TESTING SPAMGAT ARCHITECTURE AND FORWARD PASS")
    print("="*60)
    
    # 1. Instantiate GAT model
    try:
        model = SpamGAT(in_dim=768, hidden_dim=128, num_classes=2, heads=4, dropout=0.4)
        print("✅ GAT Model initialized successfully!")
        print(model)
    except Exception as e:
        print(f"❌ Failed to initialize GAT Model: {e}")
        return False
        
    # Check BatchNorm1d inclusion
    has_batchnorm = any(isinstance(layer, torch.nn.BatchNorm1d) for layer in model.input_proj)
    if has_batchnorm:
        print("✅ nn.BatchNorm1d is present in model.input_proj!")
    else:
        print("❌ nn.BatchNorm1d is missing in model.input_proj!")
        return False

    # 2. Test forward pass with mock data
    try:
        x = torch.randn(10, 768)  # 10 nodes, 768 dim
        edge_index = torch.tensor([[0, 1, 2, 3, 4, 5, 6, 7, 8, 0],
                                    [1, 2, 3, 4, 5, 6, 7, 8, 9, 9]], dtype=torch.long)
        out = model(x, edge_index)
        print(f"✅ Forward pass completed! Output shape: {out.shape}")
        if out.shape == (10, 2):
            print("✅ Output shape matches expected (10, 2)!")
        else:
            print(f"❌ Output shape mismatch: {out.shape}")
            return False
    except Exception as e:
        print(f"❌ Forward pass failed: {e}")
        return False
        
    return True

def test_sparse_graph():
    print("\n" + "="*60)
    print("🧪 TESTING 3-LAYER SPARSE GRAPH CONSTRUCTION")
    print("="*60)
    
    # 1. Create a mock dataframe
    df = pd.DataFrame({
        'sender': [
            'alice@gmail.com', 'alice@gmail.com',  # group 1 (same sender)
            'bob@yahoo.com',                       # unique sender
            'charlie@yahoo.com',                   # unique sender (same domain as bob)
            'dave@unknown.com',                    # unique domain
            'unknown@unknown.com'                  # unknown domain
        ]
    })
    
    # 2. Generate random embeddings
    node_features = torch.randn(len(df), 768)
    
    # 3. Build graph
    try:
        edge_index = build_sparse_graph(df, node_features, max_neighbors=3, sim_threshold=0.90)
        print("✅ build_sparse_graph executed successfully!")
        print(f"✅ Generated edge_index:\n{edge_index}")
        print(f"✅ Total edges: {edge_index.shape[1]}")
        
        # Check that there are no isolated nodes (every index 0 to 5 should appear in the edge list)
        all_nodes_with_edges = set(edge_index.flatten().numpy())
        print(f"✅ Nodes with edges: {all_nodes_with_edges}")
        if len(all_nodes_with_edges) == len(df):
            print("✅ Zero isolated nodes verification passed!")
        else:
            print(f"❌ Mismatch: nodes with edges is {all_nodes_with_edges}, expected all {set(range(len(df)))}")
            return False
    except Exception as e:
        print(f"❌ build_sparse_graph failed: {e}")
        return False

    return True

if __name__ == '__main__':
    arch_ok = test_gat_architecture()
    graph_ok = test_sparse_graph()
    
    if arch_ok and graph_ok:
        print("\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!")
        sys.exit(0)
    else:
        print("\n❌ SOME TESTS FAILED!")
        sys.exit(1)
