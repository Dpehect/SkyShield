import torch
import torch.nn as nn
import torch.nn.functional as F
import logging
import os


logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger("SkyShield.ModelBuilder")

class ResidualBlock(nn.Module):
    """
    Standard Residual Block to prevent vanishing gradients in deep architectures.
    """
    def __init__(self, in_channels, out_channels, stride=1):
        super(ResidualBlock, self).__init__()
        self.conv1 = nn.Conv2d(in_channels, out_channels, kernel_size=3, stride=stride, padding=1, bias=False)
        self.bn1 = nn.BatchNorm2d(out_channels)
        self.relu = nn.ReLU(inplace=True)
        self.conv2 = nn.Conv2d(out_channels, out_channels, kernel_size=3, stride=1, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(out_channels)

        self.shortcut = nn.Sequential()
        if stride != 1 or in_channels != out_channels:
            self.shortcut = nn.Sequential(
                nn.Conv2d(in_channels, out_channels, kernel_size=1, stride=stride, bias=False),
                nn.BatchNorm2d(out_channels)
            )

    def forward(self, x):
        out = self.relu(self.bn1(self.conv1(x)))
        out = self.bn2(self.conv2(out))
        out += self.shortcut(x)
        out = self.relu(out)
        return out

class DroneIdentificationNet(nn.Module):
    """
    SkyShield Neural Architecture optimized for aerial object classification.
    Features: Residual mapping, Dropout regularization, and Global Average Pooling.
    """
    def __init__(self, num_classes=2):
        super(DroneIdentificationNet, self).__init__()
        logger.info("Initializing SkyShield Neural Architecture...")

        
        self.in_planes = 64
        self.conv1 = nn.Conv2d(3, 64, kernel_size=3, stride=1, padding=1, bias=False)
        self.bn1 = nn.BatchNorm2d(64)
        self.relu = nn.ReLU(inplace=True)

        
        self.layer1 = self._make_layer(64, 2, stride=1)
        self.layer2 = self._make_layer(128, 2, stride=2)
        self.layer3 = self._make_layer(256, 2, stride=2)
        self.layer4 = self._make_layer(512, 2, stride=2)

       
        self.adaptive_pool = nn.AdaptiveAvgPool2d((1, 1))

       
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(512, 256),
            nn.ReLU(inplace=True),
            nn.Dropout(0.5),
            nn.Linear(256, num_classes),
            nn.Softmax(dim=1)
        )

    def _make_layer(self, planes, num_blocks, stride):
        strides = [stride] + [1]*(num_blocks-1)
        layers = []
        for s in strides:
            layers.append(ResidualBlock(self.in_planes, planes, s))
            self.in_planes = planes
        return nn.Sequential(*layers)

    def forward(self, x):
        """Standard forward pass logic."""
        out = self.relu(self.bn1(self.conv1(x)))
        out = self.layer1(out)
        out = self.layer2(out)
        out = self.layer3(out)
        out = self.layer4(out)
        out = self.adaptive_pool(out)
        return self.classifier(out)

def export_model_weights(target_path="models/drone_model.pt"):
    """
    Instantiates the model and exports state dictionary to binary format.
    """
    if not os.path.exists('models'):
        os.makedirs('models')

    try:
        model = DroneIdentificationNet()
        
        # Log parameter count
        total_params = sum(p.numel() for p in model.parameters())
        logger.info(f"Model Complexity: {total_params:,} parameters.")

        
        dummy_input = torch.randn(1, 3, 224, 224)
        output = model(dummy_input)
        logger.info(f"Verification Pass Success. Output Tensor Shape: {output.shape}")

        
        torch.save(model.state_dict(), target_path)
        logger.info(f"Neural weights successfully exported to {target_path}")

    except Exception as e:
        logger.error(f"Failed to export model: {e}")

if __name__ == "__main__":
    export_model_weights()