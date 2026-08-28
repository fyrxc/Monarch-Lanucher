using System.Windows;
using System.Windows.Controls;
using MonarchLauncher.App.ViewModels;

namespace MonarchLauncher.App.Views.Pages;

public partial class ModsView : UserControl
{
    private bool _loadedOnce;

    public ModsView()
    {
        InitializeComponent();
    }

    private async void UserControl_Loaded(object sender, RoutedEventArgs e)
    {
        if (_loadedOnce || DataContext is not ModsViewModel viewModel)
            return;

        _loadedOnce = true;
        await viewModel.RefreshAsync();
    }
}
