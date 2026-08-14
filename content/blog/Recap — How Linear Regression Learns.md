+++
title = "Recap — How Linear Regression Learns"
date = 2026-08-14

[taxonomies]
categories = ["Machine Learning"]

[extra]
subtitle = "A recap"
math = true
+++

在学习暂退法之前（或者同时），我想先写几篇博客，关于前面的内容。

损失函数形成一个曲面，我们称为 Loss Landscape。Weight Matrix 和 bias 是这个曲面的坐标——每个权重矩阵和 bias 的组合对应一个损失值。

前向传播计算 estimates，然后得出 error；反向传播求 loss with respect to parameters 的 gradient，自变量分别是模型的 weight 和 bias。

在整个训练过程中，只有 $W$ 和 $b$ 是可以改变的自变量。训练数据集中的 $X$ 和 $y$ 是固定的常量。

features 和 targets 在这里起什么作用呢？

在前向传播中，用于计算 loss。在 backpropagation 中，用于在不同的 weight 之间分配 penalty，影响分配的比例；并且影响梯度下降的方向。

“分配 penalty”这个直觉有一定道理，但容易产生误导。在线性回归里，从公式直接看更好：

对单个样本，

$$
\hat y = w^\top x+b
$$

$$
l=\frac12(\hat y-y)^2
$$

令

$$
e=\hat y-y
$$

那么：

$$
\nabla_w l = x(\hat{y} - y) = xe
$$

因此，可以非常漂亮地解释成：

$$
\boxed{\text{gradient}=\text{feature}\times\text{error}}
$$

一定要理解 features, weights, error 在整个过程的作用和原理，这非常重要。

接下来我们复习模型学习过程中被用到的具体的 formulas。

对于特征集合 $\mathbf{X}$，预测值 $\hat{\mathbf{y}} \in \mathbb{R}^n$ 可以通过矩阵-向量乘法表示为：

$$
\hat{y} = Xw + b\mathbf{1}.
$$

回归问题中最常用的损失函数是平方误差函数。当样本的预测值为 $\hat{y}^{(i)}$，其相应的真实标签为 $y^{(i)}$ 时，平方误差可以定义为以下公式：

$$
l^{(i)}(w, b) = \frac{1}{2} \left( \hat{y}^{(i)} - y^{(i)} \right)^2.
$$

在小批量随机梯度下降的每次迭代中，我们首先随机抽样一个小批量 $B$，它是由固定数量的训练样本组成的。然后，我们计算小批量的平均损失关于模型参数的导数（也可以称为梯度）。最后，我们将梯度乘以一个预先确定的正数 $\eta$，并从当前参数的值中减掉。

我们用下面的数学公式来表示这一更新过程（$\partial$ 表示偏导数，$i$ 是样本的索引）：

$$
(w, b) \leftarrow (w, b) - \frac{\eta}{|B|} \sum_{i \in B} \partial_{(w, b)} l^{(i)}(w, b).
$$

对于平方损失和仿射变换，我们可以明确地写成如下形式：

$$
w \leftarrow w - \frac{\eta}{|B|} \sum_{i \in B} \partial_w l^{(i)}(w, b) = w - \frac{\eta}{|B|} \sum_{i \in B} x^{(i)} \left( w^\top x^{(i)} + b - y^{(i)} \right),
$$

$$
b \leftarrow b - \frac{\eta}{|B|} \sum_{i \in B} \partial_b l^{(i)}(w, b) = b - \frac{\eta}{|B|} \sum_{i \in B} \left( w^\top x^{(i)} + b - y^{(i)} \right).
$$