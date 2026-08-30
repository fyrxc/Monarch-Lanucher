using System.Windows;
using System.Windows.Controls;
using MonarchLauncher.App.ViewModels;

namespace MonarchLauncher.App.Views.Pages;

public partial class ServersView : UserControl
{
    private bool _loadedOnce;

    public ServersView()
    {
        InitializeComponent();
    }

    private async void UserControl_Loaded(object sender, RoutedEventArgs e)
    {
        if (_loadedOnce)
            return;

        _loadedOnce = true;
        if (DataContext is ServersViewModel viewModel)
            await viewModel.RefreshAsync();
    }
}
